import express from 'express';
import {
  addMealPlanItem,
  addRecipeToActivePlan,
  getActiveMealPlan,
  getMealPlan,
  removeMealPlanItem,
  replaceMealPlanItems,
  setActiveMealPlan,
  updateDinnerNeeded
} from '../services/mealPlans.js';

export const mealPlansRouter = express.Router();

mealPlansRouter.get('/active/current', async (_req, res, next) => {
  try {
    res.json(await getActiveMealPlan());
  } catch (error) {
    next(error);
  }
});

mealPlansRouter.post('/active/:weekStart', async (req, res, next) => {
  try {
    res.json(await setActiveMealPlan(req.params.weekStart));
  } catch (error) {
    next(error);
  }
});

mealPlansRouter.post('/active/items', async (req, res, next) => {
  try {
    if (!req.body.recipe_id) return res.status(400).json({ error: 'recipe_id is required' });
    res.status(201).json(await addRecipeToActivePlan(req.body.recipe_id));
  } catch (error) {
    next(error);
  }
});

mealPlansRouter.get('/:weekStart', async (req, res, next) => {
  try {
    res.json(await getMealPlan(req.params.weekStart));
  } catch (error) {
    next(error);
  }
});

mealPlansRouter.post('/:weekStart/items', async (req, res, next) => {
  try {
    res.status(201).json(await addMealPlanItem(req.params.weekStart, req.body));
  } catch (error) {
    next(error);
  }
});

mealPlansRouter.put('/:weekStart/items', async (req, res, next) => {
  try {
    res.json(await replaceMealPlanItems(req.params.weekStart, req.body.items || []));
  } catch (error) {
    next(error);
  }
});

mealPlansRouter.patch('/:weekStart/days/:dayOfWeek', async (req, res, next) => {
  try {
    res.json(await updateDinnerNeeded(req.params.weekStart, req.params.dayOfWeek, req.body.dinner_needed));
  } catch (error) {
    next(error);
  }
});

mealPlansRouter.delete('/items/:itemId', async (req, res, next) => {
  try {
    const deleted = await removeMealPlanItem(req.params.itemId);
    if (!deleted) return res.status(404).json({ error: 'Meal plan item not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
