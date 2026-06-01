import { JSDOM } from 'jsdom';
import { normalizeNutrition } from './nutrition.js';

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function textFromInstruction(instruction) {
  if (typeof instruction === 'string') return instruction;
  if (instruction?.text) return instruction.text;
  if (instruction?.itemListElement) {
    return asArray(instruction.itemListElement).map(textFromInstruction).filter(Boolean).join('\n');
  }
  return '';
}

function findRecipeSchema(json) {
  const candidates = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    candidates.push(node);
    asArray(node['@graph']).forEach(visit);
    asArray(node.itemListElement).forEach(visit);
  };

  asArray(json).forEach(visit);

  return candidates.find((node) => {
    const types = asArray(node?.['@type']).map((type) => String(type).toLowerCase());
    return types.includes('recipe');
  }) || null;
}

function parseJsonLd(document) {
  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent.trim());
      const recipe = findRecipeSchema(parsed);
      if (recipe) return recipe;
    } catch {
      continue;
    }
  }
  return null;
}

function imageFromSchema(image) {
  const first = asArray(image)[0];
  if (typeof first === 'string') return first;
  return first?.url || first?.contentUrl || null;
}

function durationToMinutes(value) {
  if (!value) return null;
  const text = String(value).trim();
  const iso = text.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (iso) {
    const days = Number(iso[1] || 0);
    const hours = Number(iso[2] || 0);
    const minutes = Number(iso[3] || 0);
    const seconds = Number(iso[4] || 0);
    const total = days * 1440 + hours * 60 + minutes + Math.ceil(seconds / 60);
    return total || null;
  }

  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const minutes = text.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b/i);
  const total = Number(hours?.[1] || 0) * 60 + Number(minutes?.[1] || 0);
  return total || null;
}

function formatMinutes(totalMinutes) {
  if (!totalMinutes) return null;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (hours) parts.push(`${hours} hr`);
  if (minutes) parts.push(`${minutes} min`);
  return parts.join(' ');
}

function formatDuration(value) {
  const minutes = durationToMinutes(value);
  return minutes ? formatMinutes(minutes) : null;
}

function inferCookTime(schema, instructions) {
  const cookMinutes = durationToMinutes(schema.cookTime);
  if (cookMinutes) return formatMinutes(cookMinutes);

  const prepMinutes = durationToMinutes(schema.prepTime);
  const totalMinutes = durationToMinutes(schema.totalTime);
  if (totalMinutes && prepMinutes && totalMinutes > prepMinutes) {
    return formatMinutes(totalMinutes - prepMinutes);
  }

  const instructionMinutes = instructions
    .flatMap((instruction) => [...String(instruction).matchAll(/(\d+)\s*(?:to|-)?\s*(\d+)?\s*minutes?/gi)])
    .map((match) => Number(match[2] || match[1]))
    .filter(Boolean);

  if (instructionMinutes.length) {
    return formatMinutes(instructionMinutes.reduce((sum, minutes) => sum + minutes, 0));
  }

  return null;
}

function fallbackTitleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname;
    return decodeURIComponent(slug).replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  } catch {
    return 'Imported recipe';
  }
}

function fallbackDraft(url, reason, document = null) {
  return {
    title: document?.querySelector('h1')?.textContent?.trim() || document?.title || fallbackTitleFromUrl(url),
    source_url: url,
    image_url: document?.querySelector('meta[property="og:image"]')?.getAttribute('content') || null,
    servings: null,
    prep_time: null,
    cook_time: null,
    total_time: null,
    ingredients: [],
    instructions: [],
    tags: [],
    notes: reason,
    nutrition: normalizeNutrition(null),
    import_status: 'fallback'
  };
}

export async function importRecipeFromUrl(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Please enter a valid recipe URL.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'user-agent': 'Mozilla/5.0 (compatible; RecipePlannerBot/0.1; +https://example.com/recipe-import)'
      }
    });
  } catch (error) {
    return fallbackDraft(parsedUrl.toString(), `The recipe page could not be fetched from the server (${error.name || 'network error'}). You can still save this draft and fill it in manually.`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return fallbackDraft(parsedUrl.toString(), `The recipe page returned HTTP ${response.status}. Some recipe sites block automated import, so please add ingredients and instructions manually.`);
  }

  const html = await response.text();
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const schema = parseJsonLd(document);

  if (!schema) {
    return fallbackDraft(parsedUrl.toString(), 'Recipe schema was not found. Please add ingredients and instructions manually.', document);
  }

  const instructions = asArray(schema.recipeInstructions).map(textFromInstruction).filter(Boolean);

  return {
    title: schema.name || document.title || fallbackTitleFromUrl(parsedUrl.toString()),
    source_url: parsedUrl.toString(),
    image_url: imageFromSchema(schema.image),
    servings: Array.isArray(schema.recipeYield) ? schema.recipeYield[0] : schema.recipeYield || null,
    prep_time: formatDuration(schema.prepTime),
    cook_time: inferCookTime(schema, instructions),
    total_time: formatDuration(schema.totalTime),
    ingredients: asArray(schema.recipeIngredient).filter(Boolean),
    instructions,
    tags: [...asArray(schema.recipeCategory), ...asArray(schema.recipeCuisine)].filter(Boolean),
    notes: '',
    nutrition: normalizeNutrition(schema.nutrition),
    import_status: 'schema'
  };
}
