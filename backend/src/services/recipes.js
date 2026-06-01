import { query, withTransaction } from '../db/pool.js';
import { normalizeDishType } from './dishCategorizer.js';
import { getDefaultUserId } from './defaultUser.js';
import { parseIngredient } from './ingredientParser.js';

function normalizeRating(value) {
  if (value === '' || value === null || value === undefined) return null;
  const rating = Number(value);
  if (!Number.isFinite(rating)) return null;
  const rounded = Math.round(rating);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

function normalizeRecipePayload(payload) {
  const recipe = {
    title: payload.title?.trim() || 'Untitled recipe',
    source_url: payload.source_url || payload.sourceUrl || null,
    image_url: payload.image_url || payload.imageUrl || null,
    servings: payload.servings || null,
    dish_type: payload.dish_type || payload.dishType || null,
    rating: normalizeRating(payload.rating),
    prep_time: payload.prep_time || payload.prepTime || null,
    cook_time: payload.cook_time || payload.cookTime || null,
    total_time: payload.total_time || payload.totalTime || null,
    notes: payload.notes || '',
    ingredients: payload.ingredients || [],
    instructions: payload.instructions || [],
    tags: payload.tags || [],
    nutrition: payload.nutrition || {}
  };

  recipe.dish_type = normalizeDishType(recipe.dish_type, recipe);
  return recipe;
}

async function attachRecipeChildren(client, recipeId, recipe, userId) {
  for (const [index, rawIngredient] of recipe.ingredients.entries()) {
    const parsed = typeof rawIngredient === 'string' ? parseIngredient(rawIngredient) : {
      ...parseIngredient(rawIngredient.raw_text || rawIngredient.rawText || rawIngredient.name),
      ...rawIngredient
    };

    await client.query(
      `INSERT INTO ingredients (recipe_id, position, raw_text, quantity, unit, name, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [recipeId, index, parsed.rawText || parsed.raw_text, parsed.quantity, parsed.unit, parsed.name, parsed.category || 'other']
    );
  }

  for (const [index, instruction] of recipe.instructions.entries()) {
    const text = typeof instruction === 'string' ? instruction : instruction.text;
    await client.query(
      `INSERT INTO instructions (recipe_id, position, text) VALUES ($1, $2, $3)`,
      [recipeId, index, text]
    );
  }

  for (const tag of recipe.tags) {
    const name = String(tag).trim();
    if (!name) continue;
    const tagResult = await client.query(
      `INSERT INTO tags (user_id, name)
       VALUES ($1, $2)
       ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [userId, name]
    );
    await client.query(
      `INSERT INTO recipe_tags (recipe_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [recipeId, tagResult.rows[0].id]
    );
  }

  const n = recipe.nutrition || {};
  await client.query(
    `INSERT INTO nutrition_estimates
      (recipe_id, scope, calories, protein_g, carbs_g, fat_g, saturated_fat_g, fiber_g, sugar_g, sodium_mg, source)
     VALUES ($1, 'recipe', $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      recipeId,
      n.calories ?? null,
      n.protein_g ?? null,
      n.carbs_g ?? null,
      n.fat_g ?? null,
      n.saturated_fat_g ?? null,
      n.fiber_g ?? null,
      n.sugar_g ?? null,
      n.sodium_mg ?? null,
      n.source || 'placeholder'
    ]
  );
}

export async function listRecipes() {
  const result = await query(
    `SELECT r.*, COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags
     FROM recipes r
     LEFT JOIN recipe_tags rt ON rt.recipe_id = r.id
     LEFT JOIN tags t ON t.id = rt.tag_id
     GROUP BY r.id
     ORDER BY r.updated_at DESC`
  );
  return result.rows;
}

export async function getRecipe(id) {
  const recipeResult = await query('SELECT * FROM recipes WHERE id = $1', [id]);
  const recipe = recipeResult.rows[0];
  if (!recipe) return null;

  const [ingredients, instructions, tags, nutrition] = await Promise.all([
    query('SELECT * FROM ingredients WHERE recipe_id = $1 ORDER BY position', [id]),
    query('SELECT * FROM instructions WHERE recipe_id = $1 ORDER BY position', [id]),
    query(
      `SELECT t.* FROM tags t
       JOIN recipe_tags rt ON rt.tag_id = t.id
       WHERE rt.recipe_id = $1
       ORDER BY t.name`,
      [id]
    ),
    query(
      `SELECT * FROM nutrition_estimates
       WHERE recipe_id = $1 AND scope = 'recipe'
       ORDER BY created_at DESC
       LIMIT 1`,
      [id]
    )
  ]);

  return {
    ...recipe,
    ingredients: ingredients.rows,
    instructions: instructions.rows,
    tags: tags.rows.map((tag) => tag.name),
    nutrition: nutrition.rows[0] || null
  };
}

export async function createRecipe(payload) {
  const userId = await getDefaultUserId();
  const recipe = normalizeRecipePayload(payload);

  const recipeId = await withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO recipes
        (user_id, title, source_url, image_url, servings, dish_type, rating, prep_time, cook_time, total_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [userId, recipe.title, recipe.source_url, recipe.image_url, recipe.servings, recipe.dish_type, recipe.rating, recipe.prep_time, recipe.cook_time, recipe.total_time, recipe.notes]
    );
    await attachRecipeChildren(client, result.rows[0].id, recipe, userId);
    return result.rows[0].id;
  });

  return getRecipe(recipeId);
}

export async function updateRecipe(id, payload) {
  const userId = await getDefaultUserId();
  const recipe = normalizeRecipePayload(payload);

  const updatedId = await withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE recipes
       SET title = $2, source_url = $3, image_url = $4, servings = $5, dish_type = $6,
           rating = $7, prep_time = $8, cook_time = $9, total_time = $10, notes = $11, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, recipe.title, recipe.source_url, recipe.image_url, recipe.servings, recipe.dish_type, recipe.rating, recipe.prep_time, recipe.cook_time, recipe.total_time, recipe.notes]
    );

    if (!result.rows[0]) return null;

    await client.query('DELETE FROM ingredients WHERE recipe_id = $1', [id]);
    await client.query('DELETE FROM instructions WHERE recipe_id = $1', [id]);
    await client.query('DELETE FROM recipe_tags WHERE recipe_id = $1', [id]);
    await client.query("DELETE FROM nutrition_estimates WHERE recipe_id = $1 AND scope = 'recipe'", [id]);
    await attachRecipeChildren(client, id, recipe, userId);
    return id;
  });

  return updatedId ? getRecipe(updatedId) : null;
}

export async function deleteRecipe(id) {
  const result = await query('DELETE FROM recipes WHERE id = $1 RETURNING id', [id]);
  return Boolean(result.rows[0]);
}
