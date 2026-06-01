import { useState } from 'react';
import { DownloadCloud } from 'lucide-react';
import { api } from '../lib/api';
import { emptyRecipe, RecipeForm } from '../components/RecipeForm';

export function AddRecipe({ onSaved }) {
  const [recipe, setRecipe] = useState(emptyRecipe);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function importRecipe() {
    if (!url) return;
    setLoading(true);
    setMessage('');
    try {
      const draft = await api.importRecipe(url);
      setRecipe({ ...emptyRecipe, ...draft });
      setMessage(draft.import_status === 'schema' ? 'Imported recipe metadata.' : 'Imported a fallback draft for manual editing.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveRecipe(payload) {
    setLoading(true);
    try {
      await api.createRecipe(payload);
      onSaved();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Add or import</p>
          <h1>Build a recipe</h1>
        </div>
      </header>

      <div className="import-bar">
        <input placeholder="Paste a recipe URL" value={url} onChange={(event) => setUrl(event.target.value)} />
        <button onClick={importRecipe} disabled={loading}><DownloadCloud size={18} /> Import</button>
      </div>
      {message && <p className="status-message">{message}</p>}

      <RecipeForm recipe={recipe} setRecipe={setRecipe} onSave={saveRecipe} saving={loading} />
    </section>
  );
}
