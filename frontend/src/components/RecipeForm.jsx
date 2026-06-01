import { useMemo, useState } from 'react';
import { Calculator, Save } from 'lucide-react';

const emptyNutrition = {
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
  saturated_fat_g: '',
  fiber_g: '',
  sugar_g: '',
  sodium_mg: '',
  source: 'manual'
};

export const emptyRecipe = {
  title: '',
  source_url: '',
  image_url: '',
  servings: '',
  dish_type: 'main',
  prep_time: '',
  cook_time: '',
  total_time: '',
  ingredients: [],
  instructions: [],
  tags: [],
  notes: '',
  nutrition: emptyNutrition
};

const FRACTIONS = {
  '1/8': 0.125,
  '1/4': 0.25,
  '1/3': 0.333,
  '1/2': 0.5,
  '2/3': 0.667,
  '3/4': 0.75
};

function parseServings(value) {
  const match = String(value || '').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseQuantityParts(line) {
  const trimmed = line.trim();
  const mixed = trimmed.match(/^(\d+(?:\.\d+)?)\s+(\d+\/\d+)(\b.*)$/);
  if (mixed) {
    return {
      quantity: Number(mixed[1]) + fractionToNumber(mixed[2]),
      rest: mixed[3].trimStart()
    };
  }

  const simple = trimmed.match(/^(\d+(?:\.\d+)?|\d+\/\d+)(\b.*)$/);
  if (!simple) return null;

  return {
    quantity: fractionToNumber(simple[1]),
    rest: simple[2].trimStart()
  };
}

function fractionToNumber(value) {
  if (FRACTIONS[value]) return FRACTIONS[value];
  if (value.includes('/')) {
    const [top, bottom] = value.split('/').map(Number);
    return bottom ? top / bottom : Number(value);
  }
  return Number(value);
}

function formatQuantity(value) {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace(/\.00$/, '');
}

function scaleIngredientLine(line, factor) {
  const parsed = parseQuantityParts(line);
  if (!parsed || !Number.isFinite(parsed.quantity)) return line;
  return `${formatQuantity(parsed.quantity * factor)} ${parsed.rest}`.trim();
}

export function RecipeForm({ recipe, setRecipe, onSave, saving }) {
  const [targetServings, setTargetServings] = useState('');
  const [scaleMessage, setScaleMessage] = useState('');
  const ingredientsText = (recipe.ingredients || []).map((item) => item.raw_text || item.rawText || item).join('\n');
  const instructionsText = (recipe.instructions || []).map((item) => item.text || item).join('\n');
  const currentServings = useMemo(() => parseServings(recipe.servings), [recipe.servings]);

  function updateField(field, value) {
    setRecipe({ ...recipe, [field]: value });
  }

  function updateNutrition(field, value) {
    setRecipe({ ...recipe, nutrition: { ...(recipe.nutrition || emptyNutrition), [field]: value } });
  }

  function applyServingScale() {
    const target = parseServings(targetServings);
    if (!currentServings || !target) {
      setScaleMessage('Set the current servings and cooking-for value first.');
      return;
    }

    const factor = target / currentServings;
    const scaledIngredients = ingredientsText
      .split('\n')
      .map((line) => scaleIngredientLine(line, factor));

    setRecipe({
      ...recipe,
      servings: target,
      ingredients: scaledIngredients
    });
    setScaleMessage(`Scaled from ${currentServings} to ${target} servings.`);
  }

  function submit(event) {
    event.preventDefault();
    onSave({
      ...recipe,
      ingredients: ingredientsText.split('\n').map((line) => line.trim()).filter(Boolean),
      instructions: instructionsText.split('\n').map((line) => line.trim()).filter(Boolean),
      tags: typeof recipe.tags === 'string' ? recipe.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : recipe.tags
    });
  }

  return (
    <form className="recipe-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Title
          <input value={recipe.title || ''} onChange={(event) => updateField('title', event.target.value)} required />
        </label>
        <label>
          Dish Type
          <select value={recipe.dish_type || 'main'} onChange={(event) => updateField('dish_type', event.target.value)}>
            <option value="main">Main Dish</option>
            <option value="side">Side Dish</option>
            <option value="both">Main or Side</option>
          </select>
        </label>
        <label>
          Source URL
          <input value={recipe.source_url || ''} onChange={(event) => updateField('source_url', event.target.value)} />
        </label>
        <label>
          Image URL
          <input value={recipe.image_url || ''} onChange={(event) => updateField('image_url', event.target.value)} />
        </label>
        <label>
          Servings
          <input value={recipe.servings || ''} onChange={(event) => updateField('servings', event.target.value)} />
        </label>
        <label>
          Prep Time
          <input value={recipe.prep_time || ''} onChange={(event) => updateField('prep_time', event.target.value)} />
        </label>
        <label>
          Cook Time
          <input value={recipe.cook_time || ''} onChange={(event) => updateField('cook_time', event.target.value)} />
        </label>
        <label>
          Total Time
          <input value={recipe.total_time || ''} onChange={(event) => updateField('total_time', event.target.value)} />
        </label>
        <label>
          Tags
          <input value={Array.isArray(recipe.tags) ? recipe.tags.join(', ') : recipe.tags || ''} onChange={(event) => updateField('tags', event.target.value)} />
        </label>
      </div>

      <section className="scaler-panel">
        <label>
          Cooking for
          <input inputMode="decimal" placeholder="Target servings" value={targetServings} onChange={(event) => setTargetServings(event.target.value)} />
        </label>
        <button type="button" onClick={applyServingScale}>
          <Calculator size={18} />
          Scale ingredients
        </button>
        {scaleMessage && <p>{scaleMessage}</p>}
      </section>

      <label>
        Ingredients
        <textarea rows="8" value={ingredientsText} onChange={(event) => updateField('ingredients', event.target.value.split('\n'))} />
      </label>

      <label>
        Instructions
        <textarea rows="8" value={instructionsText} onChange={(event) => updateField('instructions', event.target.value.split('\n'))} />
      </label>

      <label>
        Notes
        <textarea rows="4" value={recipe.notes || ''} onChange={(event) => updateField('notes', event.target.value)} />
      </label>

      <section className="nutrition-grid">
        {Object.keys(emptyNutrition).filter((key) => key !== 'source').map((key) => (
          <label key={key}>
            {key.replace('_g', ' g').replace('_mg', ' mg').replaceAll('_', ' ')}
            <input value={recipe.nutrition?.[key] || ''} onChange={(event) => updateNutrition(key, event.target.value)} />
          </label>
        ))}
      </section>

      <button className="primary-action" type="submit" disabled={saving}>
        <Save size={18} />
        <span>{saving ? 'Saving' : 'Save recipe'}</span>
      </button>
    </form>
  );
}
