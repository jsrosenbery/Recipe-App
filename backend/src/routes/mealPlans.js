import express from 'express';
import { addMealPlanItem, getMealPlan, removeMealPlanItem, replaceMealPlanItems } from '../services/mealPlans.js';

export const mealPlansRouter = express.Router();

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

mealPlansRouter.delete('/items/:itemId', async (req, res, next) => {
  try {
    const deleted = await removeMealPlanItem(req.params.itemId);
    if (!deleted) return res.status(404).json({ error: 'Meal plan item not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
