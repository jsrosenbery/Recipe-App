import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { RecipeForm } from '../components/RecipeForm';

export function EditRecipe({ recipeId, onSaved }) {
  const [recipe, setRecipe] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getRecipe(recipeId).then(setRecipe);
  }, [recipeId]);

  async function saveRecipe(payload) {
    setSaving(true);
    await api.updateRecipe(recipeId, payload);
    setSaving(false);
    onSaved();
  }

  if (!recipe) return <section className="page"><p>Loading recipe...</p></section>;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Recipe detail</p>
          <h1>Edit recipe</h1>
        </div>
      </header>
      <RecipeForm recipe={recipe} setRecipe={setRecipe} onSave={saveRecipe} saving={saving} />
    </section>
  );
}
