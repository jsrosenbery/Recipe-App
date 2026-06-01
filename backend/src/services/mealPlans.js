import { query, withTransaction } from '../db/pool.js';
import { getDefaultUserId } from './defaultUser.js';

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const MEAL_TYPES = ['main', 'side_1', 'side_2'];

function toDateOnly(value) {
  if (!value) return value;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function normalizePlanRow(plan) {
  return { ...plan, week_start: toDateOnly(plan.week_start) };
}

async function ensureMealPlanDays(clientOrPool, mealPlanId) {
  for (const day of DAYS) {
    await clientOrPool.query(
      `INSERT INTO meal_plan_days (meal_plan_id, day_of_week, dinner_needed)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (meal_plan_id, day_of_week) DO NOTHING`,
      [mealPlanId, day]
    );
  }
}

export async function getOrCreateMealPlan(weekStart) {
  const userId = await getDefaultUserId();
  const result = await query(
    `INSERT INTO meal_plans (user_id, week_start, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, week_start) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [userId, toDateOnly(weekStart), `Week of ${toDateOnly(weekStart)}`]
  );
  await ensureMealPlanDays({ query }, result.rows[0].id);
  return normalizePlanRow(result.rows[0]);
}

export async function getActiveMealPlan() {
  const userId = await getDefaultUserId();
  const result = await query(
    `SELECT * FROM meal_plans
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY week_start DESC
     LIMIT 1`,
    [userId]
  );
  if (!result.rows[0]) return null;
  return getMealPlan(toDateOnly(result.rows[0].week_start));
}

export async function setActiveMealPlan(weekStart) {
  const userId = await getDefaultUserId();
  const dateOnly = toDateOnly(weekStart);
  const plan = await getOrCreateMealPlan(dateOnly);
  await withTransaction(async (client) => {
    await client.query('UPDATE meal_plans SET is_active = FALSE WHERE user_id = $1', [userId]);
    await client.query('UPDATE meal_plans SET is_active = TRUE, updated_at = NOW() WHERE id = $1', [plan.id]);
  });
  return getMealPlan(dateOnly);
}

export async function getMealPlan(weekStart) {
  const dateOnly = toDateOnly(weekStart);
  const plan = await getOrCreateMealPlan(dateOnly);
  const [items, days] = await Promise.all([
    query(
      `SELECT mpi.*, r.title, r.image_url, r.dish_type
       FROM meal_plan_items mpi
       LEFT JOIN recipes r ON r.id = mpi.recipe_id
       WHERE mpi.meal_plan_id = $1
       ORDER BY mpi.day_of_week, mpi.meal_type`,
      [plan.id]
    ),
    query(
      `SELECT day_of_week, dinner_needed
       FROM meal_plan_days
       WHERE meal_plan_id = $1
       ORDER BY array_position($2::text[], day_of_week)`,
      [plan.id, DAYS]
    )
  ]);
  return { ...plan, items: items.rows, days: days.rows };
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

export async function addRecipeToActivePlan(recipeId) {
  const active = await getActiveMealPlan();
  if (!active) {
    const error = new Error('Mark a week active before adding recipes from the library.');
    error.status = 400;
    throw error;
  }

  const recipeResult = await query('SELECT id, dish_type FROM recipes WHERE id = $1', [recipeId]);
  const recipe = recipeResult.rows[0];
  if (!recipe) {
    const error = new Error('Recipe not found.');
    error.status = 404;
    throw error;
  }

  const allowedTypes = recipe.dish_type === 'side' ? ['side_1', 'side_2'] : recipe.dish_type === 'both' ? MEAL_TYPES : ['main'];
  const neededDays = active.days.filter((day) => day.dinner_needed).map((day) => day.day_of_week);
  const occupied = new Set(active.items.map((item) => `${item.day_of_week}-${item.meal_type}`));

  for (const day of neededDays) {
    for (const mealType of allowedTypes) {
      if (!occupied.has(`${day}-${mealType}`)) {
        await addMealPlanItem(active.week_start, { recipe_id: recipe.id, day_of_week: day, meal_type: mealType });
        return getMealPlan(active.week_start);
      }
    }
  }

  const error = new Error('No open matching slots in the active week. Clear a slot or mark another dinner night as needed.');
  error.status = 400;
  throw error;
}

export async function replaceMealPlanItems(weekStart, items) {
  const dateOnly = toDateOnly(weekStart);
  const plan = await getOrCreateMealPlan(dateOnly);
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
  return getMealPlan(dateOnly);
}

export async function updateDinnerNeeded(weekStart, dayOfWeek, dinnerNeeded) {
  const plan = await getOrCreateMealPlan(weekStart);
  await query(
    `INSERT INTO meal_plan_days (meal_plan_id, day_of_week, dinner_needed)
     VALUES ($1, $2, $3)
     ON CONFLICT (meal_plan_id, day_of_week)
     DO UPDATE SET dinner_needed = EXCLUDED.dinner_needed`,
    [plan.id, dayOfWeek, Boolean(dinnerNeeded)]
  );
  return getMealPlan(plan.week_start);
}

export async function removeMealPlanItem(itemId) {
  const result = await query('DELETE FROM meal_plan_items WHERE id = $1 RETURNING id', [itemId]);
  return Boolean(result.rows[0]);
}
