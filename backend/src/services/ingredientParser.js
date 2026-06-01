const CATEGORIES = [
  { name: 'produce', terms: ['onion', 'garlic', 'tomato', 'pepper', 'lettuce', 'spinach', 'carrot', 'potato', 'cilantro', 'parsley', 'lemon', 'lime', 'apple', 'banana', 'broccoli'] },
  { name: 'meat/seafood', terms: ['chicken', 'beef', 'pork', 'turkey', 'salmon', 'shrimp', 'fish', 'bacon', 'sausage'] },
  { name: 'dairy', terms: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'eggs'] },
  { name: 'dry goods', terms: ['rice', 'pasta', 'flour', 'sugar', 'oats', 'quinoa', 'lentils', 'beans', 'bread crumbs'] },
  { name: 'canned/jarred goods', terms: ['canned', 'jar', 'tomato paste', 'broth', 'stock', 'olives', 'salsa'] },
  { name: 'frozen', terms: ['frozen'] },
  { name: 'bakery', terms: ['bread', 'tortilla', 'bun', 'roll', 'bagel'] },
  { name: 'spices/seasonings', terms: ['salt', 'pepper', 'cumin', 'paprika', 'oregano', 'basil', 'thyme', 'cinnamon', 'chili powder'] },
  { name: 'condiments', terms: ['mustard', 'ketchup', 'mayonnaise', 'soy sauce', 'vinegar', 'hot sauce', 'oil'] }
];

const UNITS = [
  'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons',
  'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'g', 'gram', 'grams',
  'kg', 'ml', 'l', 'clove', 'cloves', 'can', 'cans', 'package', 'packages'
];

const FRACTIONS = {
  '1/4': 0.25,
  '1/3': 0.333,
  '1/2': 0.5,
  '2/3': 0.667,
  '3/4': 0.75
};

export function categorizeIngredient(text = '') {
  const lower = text.toLowerCase();
  for (const category of CATEGORIES) {
    if (category.terms.some((term) => lower.includes(term))) {
      return category.name;
    }
  }
  return 'other';
}

function parseQuantity(token) {
  if (!token) return null;
  if (FRACTIONS[token]) return FRACTIONS[token];
  if (/^\d+(\.\d+)?$/.test(token)) return Number(token);
  if (/^\d+-\d+$/.test(token)) return null;
  if (/^\d+\s+\d\/\d$/.test(token)) {
    const [whole, fraction] = token.split(/\s+/);
    return Number(whole) + (FRACTIONS[fraction] || 0);
  }
  return null;
}

export function parseIngredient(rawText) {
  const normalized = String(rawText || '').trim();
  const tokens = normalized.split(/\s+/);
  let quantity = parseQuantity(tokens[0]);
  let unit = null;
  let nameStart = 0;

  if (quantity !== null) {
    nameStart = 1;
    const possibleUnit = tokens[1]?.toLowerCase().replace(/[.,]/g, '');
    if (UNITS.includes(possibleUnit)) {
      unit = possibleUnit;
      nameStart = 2;
    }
  }

  const name = tokens.slice(nameStart).join(' ').replace(/^of\s+/i, '').replace(/[,;].*$/, '').trim() || normalized;

  return {
    rawText: normalized,
    quantity,
    unit,
    name,
    category: categorizeIngredient(normalized)
  };
}

export function combineShoppingItems(ingredients) {
  const grouped = new Map();

  for (const ingredient of ingredients) {
    const parsed = parseIngredient(ingredient.raw_text || ingredient.rawText || ingredient);
    const unitKey = parsed.unit || '';
    const key = `${parsed.name.toLowerCase()}|${unitKey}|${parsed.category}`;
    const current = grouped.get(key);

    if (current && current.quantity !== null && parsed.quantity !== null && current.unit === parsed.unit) {
      current.quantity += parsed.quantity;
      current.rawText = `${formatQuantity(current.quantity)} ${current.unit || ''} ${current.name}`.trim();
    } else if (current) {
      current.rawText = `${current.rawText}; ${parsed.rawText}`;
    } else {
      grouped.set(key, {
        ...parsed,
        rawText: parsed.rawText
      });
    }
  }

  return [...grouped.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

function formatQuantity(quantity) {
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)));
}
