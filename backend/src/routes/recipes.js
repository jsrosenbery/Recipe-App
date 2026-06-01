import express from 'express';
import { createRecipe, deleteRecipe, getRecipe, listRecipes, updateRecipe } from '../services/recipes.js';
import { importRecipeFromUrl } from '../services/recipeImporter.js';

export const recipesRouter = express.Router();

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const FIELD_LIMITS = {
  title: 200,
  source_url: 1000,
  image_url: 1000,
  servings: 80,
  prep_time: 80,
  cook_time: 80,
  total_time: 80,
  notes: 10000
};

function flattenRecipeText(payload) {
  const fields = [
    ['title', payload.title],
    ['source URL', payload.source_url || payload.sourceUrl],
    ['image URL', payload.image_url || payload.imageUrl],
    ['servings', payload.servings],
    ['prep time', payload.prep_time || payload.prepTime],
    ['cook time', payload.cook_time || payload.cookTime],
    ['total time', payload.total_time || payload.totalTime],
    ['notes', payload.notes]
  ];

  for (const [index, ingredient] of (payload.ingredients || []).entries()) {
    const value = typeof ingredient === 'string' ? ingredient : ingredient.raw_text || ingredient.rawText || ingredient.name;
    fields.push([`ingredient ${index + 1}`, value]);
  }

  for (const [index, instruction] of (payload.instructions || []).entries()) {
    const value = typeof instruction === 'string' ? instruction : instruction.text;
    fields.push([`instruction ${index + 1}`, value]);
  }

  for (const [index, tag] of (payload.tags || []).entries()) {
    fields.push([`tag ${index + 1}`, tag]);
  }

  return fields;
}

function validateRecipePayload(req, res, next) {
  const payload = req.body || {};

  if (!String(payload.title || '').trim()) {
    return res.status(400).json({ error: 'Recipe title is required before saving.' });
  }

  for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
    const value = payload[field] || payload[field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())];
    if (value && String(value).length > limit) {
      return res.status(400).json({ error: `The ${field.replaceAll('_', ' ')} field is too long to save. Please shorten it and try again.` });
    }
  }

  for (const [label, value] of flattenRecipeText(payload)) {
    if (value && CONTROL_CHARACTERS.test(String(value))) {
      return res.status(400).json({ error: `The ${label} contains hidden control characters that cannot be saved. Remove unusual copied text and try again.` });
    }
  }

  next();
}

recipesRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await listRecipes());
  } catch (error) {
    next(error);
  }
});

recipesRouter.post('/import', async (req, res, next) => {
  try {
    if (!req.body.url) return res.status(400).json({ error: 'url is required' });
    const draft = await importRecipeFromUrl(req.body.url);
    res.json(draft);
  } catch (error) {
    next(error);
  }
});

recipesRouter.post('/', validateRecipePayload, async (req, res, next) => {
  try {
    res.status(201).json(await createRecipe(req.body));
  } catch (error) {
    next(error);
  }
});

recipesRouter.get('/:id', async (req, res, next) => {
  try {
    const recipe = await getRecipe(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (error) {
    next(error);
  }
});

recipesRouter.put('/:id', validateRecipePayload, async (req, res, next) => {
  try {
    const recipe = await updateRecipe(req.params.id, req.body);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (error) {
    next(error);
  }
});

recipesRouter.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await deleteRecipe(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Recipe not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
