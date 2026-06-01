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

  return {
    title: schema.name || document.title || fallbackTitleFromUrl(parsedUrl.toString()),
    source_url: parsedUrl.toString(),
    image_url: imageFromSchema(schema.image),
    servings: Array.isArray(schema.recipeYield) ? schema.recipeYield[0] : schema.recipeYield || null,
    prep_time: schema.prepTime || null,
    cook_time: schema.cookTime || null,
    total_time: schema.totalTime || null,
    ingredients: asArray(schema.recipeIngredient).filter(Boolean),
    instructions: asArray(schema.recipeInstructions).map(textFromInstruction).filter(Boolean),
    tags: [...asArray(schema.recipeCategory), ...asArray(schema.recipeCuisine)].filter(Boolean),
    notes: '',
    nutrition: normalizeNutrition(schema.nutrition),
    import_status: 'schema'
  };
}
