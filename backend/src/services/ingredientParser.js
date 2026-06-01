const CATEGORIES = [
  { name: 'produce', terms: ['onion', 'garlic', 'tomato', 'pepper', 'lettuce', 'spinach', 'carrot', 'potato', 'cilantro', 'parsley', 'lemon', 'lime', 'apple', 'banana', 'broccoli', 'shallot', 'scallion', 'celery', 'mushroom', 'zucchini', 'squash', 'cucumber', 'avocado', 'corn', 'jalapeno', 'ginger'] },
  { name: 'canned/jarred goods', terms: ['canned', 'can ', 'jar', 'tomato paste', 'broth', 'stock', 'olives', 'salsa', 'marinara', 'beans', 'chiles', 'pickles'] },
  { name: 'meat/seafood', terms: ['chicken', 'beef', 'pork', 'turkey', 'salmon', 'shrimp', 'fish', 'bacon', 'sausage', 'steak', 'sirloin', 'ribeye', 'chuck', 'roast', 'ribs', 'brisket', 'lamb', 'veal', 'ham', 'prosciutto', 'pepperoni', 'meatball', 'meatballs', 'thigh', 'thighs', 'breast', 'breasts', 'drumstick', 'drumsticks', 'wing', 'wings', 'tenderloin', 'loin', 'cutlet', 'cutlets', 'cod', 'halibut', 'tilapia', 'tuna', 'mahi', 'bass', 'trout', 'crab', 'lobster', 'scallop', 'scallops', 'clam', 'clams', 'mussel', 'mussels'] },
  { name: 'dairy', terms: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'eggs', 'mozzarella', 'cheddar', 'parmesan', 'sour cream', 'half-and-half'] },
  { name: 'dry goods', terms: ['rice', 'pasta', 'flour', 'sugar', 'oats', 'quinoa', 'lentils', 'beans', 'bread crumbs', 'breadcrumbs', 'noodles', 'couscous', 'cornmeal'] },
  { name: 'frozen', terms: ['frozen'] },
  { name: 'bakery', terms: ['bread', 'tortilla', 'bun', 'buns', 'roll', 'rolls', 'bagel', 'pita', 'naan'] },
  { name: 'spices/seasonings', terms: ['salt', 'pepper', 'cumin', 'paprika', 'oregano', 'basil', 'thyme', 'cinnamon', 'chili powder', 'garlic powder', 'onion powder', 'cayenne', 'seasoning'] },
  { name: 'condiments', terms: ['mustard', 'ketchup', 'mayonnaise', 'mayo', 'soy sauce', 'vinegar', 'hot sauce', 'oil', 'worcestershire', 'bbq sauce', 'barbecue sauce', 'honey'] }
];

const UNITS = [
  'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons',
  'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'g', 'gram', 'grams',
  'kg', 'ml', 'l', 'clove', 'cloves', 'can', 'cans', 'package', 'packages', 'pkg',
  'bag', 'bags', 'box', 'boxes', 'slice', 'slices', 'piece', 'pieces', 'stalk', 'stalks'
];

const FRACTIONS = {
  '1/8': 0.125,
  '1/4': 0.25,
  '1/3': 0.333,
  '1/2': 0.5,
  '2/3': 0.667,
  '3/4': 0.75
};

const UNICODE_FRACTIONS = {
  '¼': '1/4',
  '⅓': '1/3',
  '½': '1/2',
  '⅔': '2/3',
  '¾': '3/4',
  '⅛': '1/8'
};

const PREP_WORDS = new Set([
  'boneless', 'skinless', 'fresh', 'frozen', 'large', 'small', 'medium', 'thinly', 'finely',
  'roughly', 'chopped', 'diced', 'sliced', 'minced', 'grated', 'shredded', 'crushed',
  'divided', 'optional', 'trimmed', 'cooked', 'uncooked', 'raw', 'lean', 'extra-lean'
]);

function normalizeText(text = '') {
  return String(text)
    .replace(/[¼⅓½⅔¾⅛]/g, (match) => ` ${UNICODE_FRACTIONS[match]} `)
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function termMatches(lower, term) {
  const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  if (term.endsWith(' ')) return lower.includes(term);
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(lower);
}

export function categorizeIngredient(text = '') {
  const lower = normalizeText(text).toLowerCase();
  for (const category of CATEGORIES) {
    if (category.terms.some((term) => termMatches(lower, term))) {
      return category.name;
    }
  }
  return 'other';
}

function parseQuantityToken(token) {
  if (!token) return null;
  if (FRACTIONS[token]) return FRACTIONS[token];
  if (/^\d+(\.\d+)?$/.test(token)) return Number(token);
  if (/^\d+-\d+$/.test(token)) return null;
  if (/^\d+\/\d+$/.test(token)) {
    const [top, bottom] = token.split('/').map(Number);
    return bottom ? top / bottom : null;
  }
  return null;
}

function parseQuantity(tokens) {
  const first = parseQuantityToken(tokens[0]);
  if (first === null) return { quantity: null, consumed: 0 };

  const second = parseQuantityToken(tokens[1]);
  if (/^\d+$/.test(tokens[0]) && /^\d+\/\d+$/.test(tokens[1] || '') && second !== null) {
    return { quantity: first + second, consumed: 2 };
  }

  return { quantity: first, consumed: 1 };
}

function cleanName(name) {
  const withoutParenthetical = name.replace(/\([^)]*\)/g, ' ');
  const beforePrepNotes = withoutParenthetical.replace(/[,;].*$/, '');
  const words = beforePrepNotes.split(/\s+/).filter(Boolean);
  const filtered = words.filter((word) => !PREP_WORDS.has(word.toLowerCase().replace(/[.,]/g, '')));
  return (filtered.join(' ') || beforePrepNotes || name).trim();
}

export function parseIngredient(rawText) {
  const normalized = normalizeText(rawText);
  const tokens = normalized.split(/\s+/);
  const parsedQuantity = parseQuantity(tokens);
  let quantity = parsedQuantity.quantity;
  let unit = null;
  let nameStart = parsedQuantity.consumed;

  if (quantity !== null) {
    const possibleUnit = tokens[nameStart]?.toLowerCase().replace(/[.,]/g, '');
    if (UNITS.includes(possibleUnit)) {
      unit = possibleUnit;
      nameStart += 1;
    }
  }

  const name = cleanName(tokens.slice(nameStart).join(' ').replace(/^of\s+/i, '')) || normalized;

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
    const category = ingredient.category && ingredient.category !== 'other' ? ingredient.category : parsed.category;
    const unitKey = parsed.unit || '';
    const key = `${parsed.name.toLowerCase()}|${unitKey}|${category}`;
    const current = grouped.get(key);

    if (current && current.quantity !== null && parsed.quantity !== null && current.unit === parsed.unit) {
      current.quantity += parsed.quantity;
      current.rawText = `${formatQuantity(current.quantity)} ${current.unit || ''} ${current.name}`.trim();
    } else if (current) {
      current.rawText = `${current.rawText}; ${parsed.rawText}`;
    } else {
      grouped.set(key, {
        ...parsed,
        category,
        rawText: parsed.rawText
      });
    }
  }

  return [...grouped.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

function formatQuantity(quantity) {
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)));
}
