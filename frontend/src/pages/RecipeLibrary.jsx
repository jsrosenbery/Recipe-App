import { CalendarPlus, Clock, ExternalLink, Pencil, Trash2 } from 'lucide-react';

function dishLabel(dishType) {
  if (dishType === 'side') return 'Side';
  if (dishType === 'both') return 'Main or Side';
  return 'Main';
}

export function RecipeLibrary({ recipes, activePlan, notice, onEdit, onAdd, onDelete, onAddToActivePlan }) {
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Recipe repository</p>
          <h1>Saved recipes</h1>
          {activePlan && <p className="subtle-line">Active week: {activePlan.week_start}</p>}
          {notice && <p className="status-message">{notice}</p>}
        </div>
        <button className="primary-action" onClick={onAdd}>Add recipe</button>
      </header>

      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <article className="recipe-card" key={recipe.id}>
            {recipe.image_url ? <img src={recipe.image_url} alt="" /> : <div className="image-placeholder" />}
            <div>
              <h2>{recipe.title}</h2>
              <p className="meta"><Clock size={15} /> {recipe.total_time || recipe.prep_time || 'Time not set'} · {dishLabel(recipe.dish_type)}</p>
              <div className="tag-row">
                {(recipe.tags || []).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
              <div className="card-actions">
                <button className="primary-action" onClick={() => onAddToActivePlan(recipe)}><CalendarPlus size={16} /> Add to week</button>
                <button onClick={() => onEdit(recipe.id)}><Pencil size={16} /> Edit</button>
                <button className="danger-action" onClick={() => onDelete(recipe)}><Trash2 size={16} /> Delete</button>
                {recipe.source_url && <a href={recipe.source_url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Source</a>}
              </div>
            </div>
          </article>
        ))}
      </div>

      {!recipes.length && (
        <div className="empty-state">
          <h2>No recipes yet</h2>
          <p>Import a recipe URL or add one manually to start planning your week.</p>
        </div>
      )}
    </section>
  );
}
