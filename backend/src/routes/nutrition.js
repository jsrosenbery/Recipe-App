import express from 'express';
import { query } from '../db/pool.js';
import { estimateWeeklyNutrition } from '../services/nutrition.js';
import { getOrCreateMealPlan } from '../services/mealPlans.js';

export const nutritionRouter = express.Router();

nutritionRouter.get('/week/:weekStart', async (req, res, next) => {
  try {
    const plan = await getOrCreateMealPlan(req.params.weekStart);
    const result = await query(
      `SELECT ne.*
       FROM meal_plan_items mpi
       JOIN nutrition_estimates ne ON ne.recipe_id = mpi.recipe_id AND ne.scope = 'recipe'
       WHERE mpi.meal_plan_id = $1`,
      [plan.id]
    );
    res.json(estimateWeeklyNutrition(result.rows.map((nutrition) => ({ nutrition }))));
  } catch (error) {
    next(error);
  }
});
