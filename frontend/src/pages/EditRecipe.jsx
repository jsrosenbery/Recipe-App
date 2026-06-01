import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ErrorDialog } from '../components/ErrorDialog';
import { RecipeForm } from '../components/RecipeForm';

export function EditRecipe({ recipeId, onSaved }) {
  const [recipe, setRecipe] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    api.getRecipe(recipeId).then(setRecipe);
  }, [recipeId]);

  async function saveRecipe(payload) {
    setSaving(true);
    setSaveError('');
    try {
      await api.updateRecipe(recipeId, payload);
      onSaved();
    } catch (error) {
      setSaveError(error.message || 'This recipe has content that cannot be saved. Please review it and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!recipe) return <section className="page"><p>Loading recipe...</p></section>;

  return (
    <section className="page">
      <ErrorDialog message={saveError} onClose={() => setSaveError('')} />
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
