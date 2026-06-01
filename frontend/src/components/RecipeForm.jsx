import { Save } from 'lucide-react';

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
  prep_time: '',
  cook_time: '',
  total_time: '',
  ingredients: [],
  instructions: [],
  tags: [],
  notes: '',
  nutrition: emptyNutrition
};

export function RecipeForm({ recipe, setRecipe, onSave, saving }) {
  const ingredientsText = (recipe.ingredients || []).map((item) => item.raw_text || item.rawText || item).join('\n');
  const instructionsText = (recipe.instructions || []).map((item) => item.text || item).join('\n');

  function updateField(field, value) {
    setRecipe({ ...recipe, [field]: value });
  }

  function updateNutrition(field, value) {
    setRecipe({ ...recipe, nutrition: { ...(recipe.nutrition || emptyNutrition), [field]: value } });
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
