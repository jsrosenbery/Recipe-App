const EMPTY_NUTRITION = {
  calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  saturated_fat_g: null,
  fiber_g: null,
  sugar_g: null,
  sodium_mg: null,
  source: 'placeholder'
};

const NUTRITION_KEYS = {
  calories: 'calories',
  proteinContent: 'protein_g',
  carbohydrateContent: 'carbs_g',
  fatContent: 'fat_g',
  saturatedFatContent: 'saturated_fat_g',
  fiberContent: 'fiber_g',
  sugarContent: 'sugar_g',
  sodiumContent: 'sodium_mg'
};

function numberFromNutritionValue(value) {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}

export function normalizeNutrition(schemaNutrition) {
  if (!schemaNutrition || typeof schemaNutrition !== 'object') {
    return { ...EMPTY_NUTRITION };
  }

  const normalized = { ...EMPTY_NUTRITION, source: 'recipe-schema' };
  for (const [schemaKey, appKey] of Object.entries(NUTRITION_KEYS)) {
    normalized[appKey] = numberFromNutritionValue(schemaNutrition[schemaKey]);
  }
  return normalized;
}

export function estimateWeeklyNutrition(recipes) {
  return recipes.reduce((summary, recipe) => {
    const nutrition = recipe.nutrition || {};
    for (const key of Object.keys(EMPTY_NUTRITION)) {
      if (key === 'source') continue;
      summary[key] = (summary[key] || 0) + Number(nutrition[key] || 0);
    }
    return summary;
  }, { source: 'weekly-rollup' });
}
