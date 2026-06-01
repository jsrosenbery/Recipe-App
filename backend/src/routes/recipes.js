import express from 'express';
import { createRecipe, deleteRecipe, getRecipe, listRecipes, updateRecipe } from '../services/recipes.js';
import { importRecipeFromUrl } from '../services/recipeImporter.js';

export const recipesRouter = express.Router();

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

recipesRouter.post('/', async (req, res, next) => {
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

recipesRouter.put('/:id', async (req, res, next) => {
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
