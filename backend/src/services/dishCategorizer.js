const MAIN_TERMS = [
  'chicken', 'beef', 'pork', 'turkey', 'salmon', 'shrimp', 'fish', 'steak', 'thigh', 'breast',
  'meatball', 'burger', 'sandwich', 'taco', 'enchilada', 'lasagna', 'casserole', 'pasta',
  'pizza', 'stew', 'chili', 'curry', 'roast', 'ribs', 'sausage', 'meatloaf'
];

const SIDE_TERMS = [
  'side', 'salad', 'slaw', 'potato', 'potatoes', 'rice', 'beans', 'corn', 'bread', 'rolls',
  'biscuits', 'vegetable', 'vegetables', 'broccoli', 'asparagus', 'carrots', 'brussels',
  'fries', 'mac and cheese', 'coleslaw', 'green beans', 'mashed', 'gratin'
];

const BOTH_TERMS = [
  'mac and cheese', 'fried rice', 'loaded potato', 'stuffed potato', 'caesar salad', 'cobb salad',
  'soup', 'quiche', 'frittata', 'grain bowl', 'bowl'
];

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

export function categorizeDishType(recipe) {
  const text = [
    recipe.title,
    ...(recipe.tags || []),
    ...(recipe.ingredients || []).map((ingredient) => typeof ingredient === 'string' ? ingredient : ingredient.raw_text || ingredient.rawText || ingredient.name)
  ].filter(Boolean).join(' ').toLowerCase();

  if (includesAny(text, BOTH_TERMS)) return 'both';

  const mainScore = MAIN_TERMS.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
  const sideScore = SIDE_TERMS.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);

  if (mainScore && sideScore) return 'both';
  if (sideScore > mainScore) return 'side';
  return 'main';
}

export function normalizeDishType(value, recipe) {
  if (['main', 'side', 'both'].includes(value)) return value;
  return categorizeDishType(recipe);
}
