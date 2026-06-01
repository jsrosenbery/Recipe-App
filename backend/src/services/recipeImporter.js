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
  const nodes = asArray(json?.['@graph'] || json);
  for (const node of nodes) {
    const types = asArray(node?.['@type']).map((type) => String(type).toLowerCase());
    if (types.includes('recipe')) return node;
  }
  return null;
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
  return first?.url || null;
}

function fallbackFromDocument(document, url) {
  return {
    title: document.querySelector('h1')?.textContent?.trim() || document.title || 'Imported recipe',
    source_url: url,
    image_url: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null,
    servings: null,
    prep_time: null,
    cook_time: null,
    total_time: null,
    ingredients: [],
    instructions: [],
    tags: [],
    notes: 'Recipe schema was not found. Please add ingredients and instructions manually.',
    nutrition: normalizeNutrition(null),
    import_status: 'fallback'
  };
}

export async function importRecipeFromUrl(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'RecipePlannerBot/0.1 (+personal recipe import)'
    }
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch recipe URL. Received HTTP ${response.status}.`);
  }

  const html = await response.text();
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const schema = parseJsonLd(document);

  if (!schema) {
    return fallbackFromDocument(document, url);
  }

  return {
    title: schema.name || document.title || 'Imported recipe',
    source_url: url,
    image_url: imageFromSchema(schema.image),
    servings: Array.isArray(schema.recipeYield) ? schema.recipeYield[0] : schema.recipeYield || null,
    prep_time: schema.prepTime || null,
    cook_time: schema.cookTime || null,
    total_time: schema.totalTime || null,
    ingredients: asArray(schema.recipeIngredient).filter(Boolean),
    instructions: asArray(schema.recipeInstructions).map(textFromInstruction).filter(Boolean),
    tags: asArray(schema.recipeCategory || schema.recipeCuisine).filter(Boolean),
    notes: '',
    nutrition: normalizeNutrition(schema.nutrition),
    import_status: 'schema'
  };
}
