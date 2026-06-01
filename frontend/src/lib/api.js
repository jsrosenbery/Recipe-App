const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  listRecipes: () => request('/api/recipes'),
  getRecipe: (id) => request(`/api/recipes/${id}`),
  createRecipe: (recipe) => request('/api/recipes', { method: 'POST', body: recipe }),
  updateRecipe: (id, recipe) => request(`/api/recipes/${id}`, { method: 'PUT', body: recipe }),
  deleteRecipe: (id) => request(`/api/recipes/${id}`, { method: 'DELETE' }),
  importRecipe: (url) => request('/api/recipes/import', { method: 'POST', body: { url } }),
  getActiveMealPlan: () => request('/api/meal-plans/active/current'),
  setActiveMealPlan: (weekStart) => request(`/api/meal-plans/active/${weekStart}`, { method: 'POST' }),
  addRecipeToActiveMealPlan: (recipeId) => request('/api/meal-plans/active/items', { method: 'POST', body: { recipe_id: recipeId } }),
  getMealPlan: (weekStart) => request(`/api/meal-plans/${weekStart}`),
  saveMealPlanItems: (weekStart, items) => request(`/api/meal-plans/${weekStart}/items`, { method: 'PUT', body: { items } }),
  updateDinnerNeeded: (weekStart, dayOfWeek, dinnerNeeded) => request(`/api/meal-plans/${weekStart}/days/${dayOfWeek}`, { method: 'PATCH', body: { dinner_needed: dinnerNeeded } }),
  getShoppingList: (weekStart) => request(`/api/shopping-lists/week/${weekStart}`),
  generateShoppingList: (weekStart) => request(`/api/shopping-lists/week/${weekStart}/generate`, { method: 'POST' }),
  addShoppingItem: (listId, raw_text) => request(`/api/shopping-lists/${listId}/items`, { method: 'POST', body: { raw_text } }),
  updateShoppingItem: (itemId, patch) => request(`/api/shopping-lists/items/${itemId}`, { method: 'PATCH', body: patch }),
  deleteShoppingItem: (itemId) => request(`/api/shopping-lists/items/${itemId}`, { method: 'DELETE' }),
  getWeeklyNutrition: (weekStart) => request(`/api/nutrition/week/${weekStart}`)
};

export function getMonday(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  return copy.toISOString().slice(0, 10);
}
