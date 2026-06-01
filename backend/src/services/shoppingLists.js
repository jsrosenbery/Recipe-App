import { query, withTransaction } from '../db/pool.js';
import { getDefaultUserId } from './defaultUser.js';
import { combineShoppingItems, parseIngredient } from './ingredientParser.js';
import { getOrCreateMealPlan } from './mealPlans.js';

export async function generateShoppingList(weekStart) {
  const userId = await getDefaultUserId();
  const plan = await getOrCreateMealPlan(weekStart);
  const ingredients = await query(
    `SELECT i.*
     FROM meal_plan_items mpi
     JOIN ingredients i ON i.recipe_id = mpi.recipe_id
     WHERE mpi.meal_plan_id = $1`,
    [plan.id]
  );
  const combined = combineShoppingItems(ingredients.rows);

  return withTransaction(async (client) => {
    const listResult = await client.query(
      `INSERT INTO shopping_lists (user_id, meal_plan_id, title)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, plan.id, `Shopping list for ${weekStart}`]
    );

    for (const item of combined) {
      await client.query(
        `INSERT INTO shopping_list_items (shopping_list_id, raw_text, quantity, unit, name, category)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [listResult.rows[0].id, item.rawText, item.quantity, item.unit, item.name, item.category]
      );
    }

    return getShoppingList(listResult.rows[0].id);
  });
}

export async function getShoppingList(id) {
  const listResult = await query('SELECT * FROM shopping_lists WHERE id = $1', [id]);
  const list = listResult.rows[0];
  if (!list) return null;
  const items = await query('SELECT * FROM shopping_list_items WHERE shopping_list_id = $1 ORDER BY category, name', [id]);
  return { ...list, items: items.rows };
}

export async function getLatestShoppingList(weekStart) {
  const plan = await getOrCreateMealPlan(weekStart);
  const result = await query(
    `SELECT * FROM shopping_lists
     WHERE meal_plan_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [plan.id]
  );
  return result.rows[0] ? getShoppingList(result.rows[0].id) : null;
}

export async function updateShoppingListItem(id, payload) {
  const parsed = payload.raw_text ? parseIngredient(payload.raw_text) : null;
  const result = await query(
    `UPDATE shopping_list_items
     SET raw_text = COALESCE($2, raw_text),
         quantity = COALESCE($3, quantity),
         unit = COALESCE($4, unit),
         name = COALESCE($5, name),
         category = COALESCE($6, category),
         checked = COALESCE($7, checked)
     WHERE id = $1
     RETURNING *`,
    [
      id,
      payload.raw_text || null,
      payload.quantity ?? parsed?.quantity ?? null,
      payload.unit ?? parsed?.unit ?? null,
      payload.name ?? parsed?.name ?? null,
      payload.category ?? parsed?.category ?? null,
      payload.checked ?? null
    ]
  );
  return result.rows[0] || null;
}

export async function addShoppingListItem(listId, payload) {
  const parsed = parseIngredient(payload.raw_text || payload.name);
  const result = await query(
    `INSERT INTO shopping_list_items (shopping_list_id, raw_text, quantity, unit, name, category, is_manual)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     RETURNING *`,
    [listId, parsed.rawText, parsed.quantity, parsed.unit, parsed.name, payload.category || parsed.category]
  );
  return result.rows[0];
}

export async function deleteShoppingListItem(id) {
  const result = await query('DELETE FROM shopping_list_items WHERE id = $1 RETURNING id', [id]);
  return Boolean(result.rows[0]);
}
