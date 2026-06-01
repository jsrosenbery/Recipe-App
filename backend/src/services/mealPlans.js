import { query, withTransaction } from '../db/pool.js';
import { getDefaultUserId } from './defaultUser.js';

export async function getOrCreateMealPlan(weekStart) {
  const userId = await getDefaultUserId();
  const result = await query(
    `INSERT INTO meal_plans (user_id, week_start, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, week_start) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [userId, weekStart, `Week of ${weekStart}`]
  );
  return result.rows[0];
}

export async function getMealPlan(weekStart) {
  const plan = await getOrCreateMealPlan(weekStart);
  const items = await query(
    `SELECT mpi.*, r.title, r.image_url
     FROM meal_plan_items mpi
     LEFT JOIN recipes r ON r.id = mpi.recipe_id
     WHERE mpi.meal_plan_id = $1
     ORDER BY mpi.day_of_week, mpi.meal_type`,
    [plan.id]
  );
  return { ...plan, items: items.rows };
}

export async function addMealPlanItem(weekStart, payload) {
  const plan = await getOrCreateMealPlan(weekStart);
  const result = await query(
    `INSERT INTO meal_plan_items (meal_plan_id, recipe_id, day_of_week, meal_type, servings, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [plan.id, payload.recipe_id, payload.day_of_week, payload.meal_type, payload.servings || null, payload.notes || '']
  );
  return result.rows[0];
}

export async function replaceMealPlanItems(weekStart, items) {
  const plan = await getOrCreateMealPlan(weekStart);
  await withTransaction(async (client) => {
    await client.query('DELETE FROM meal_plan_items WHERE meal_plan_id = $1', [plan.id]);
    for (const item of items) {
      await client.query(
        `INSERT INTO meal_plan_items (meal_plan_id, recipe_id, day_of_week, meal_type, servings, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [plan.id, item.recipe_id, item.day_of_week, item.meal_type, item.servings || null, item.notes || '']
      );
    }
  });
  return getMealPlan(weekStart);
}

export async function removeMealPlanItem(itemId) {
  const result = await query('DELETE FROM meal_plan_items WHERE id = $1 RETURNING id', [itemId]);
  return Boolean(result.rows[0]);
}
