import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { api } from './lib/api';
import { AddRecipe } from './pages/AddRecipe';
import { EditRecipe } from './pages/EditRecipe';
import { RecipeLibrary } from './pages/RecipeLibrary';
import { ShoppingList } from './pages/ShoppingList';
import { WeeklyPlanner } from './pages/WeeklyPlanner';
import './styles.css';

export default function App() {
  const [activePage, setActivePage] = useState('library');
  const [recipes, setRecipes] = useState([]);
  const [editingRecipeId, setEditingRecipeId] = useState(null);

  async function refreshRecipes() {
    setRecipes(await api.listRecipes());
  }

  useEffect(() => {
    refreshRecipes().catch(console.error);
  }, []);

  function handleSaved() {
    refreshRecipes();
    setEditingRecipeId(null);
    setActivePage('library');
  }

  async function handleDelete(recipe) {
    const confirmed = window.confirm(`Delete "${recipe.title}"? This also removes it from future meal plans and shopping lists.`);
    if (!confirmed) return;
    await api.deleteRecipe(recipe.id);
    refreshRecipes();
  }

  let page = (
    <RecipeLibrary
      recipes={recipes}
      onAdd={() => setActivePage('add')}
      onEdit={(id) => { setEditingRecipeId(id); setActivePage('edit'); }}
      onDelete={handleDelete}
    />
  );

  if (activePage === 'add') page = <AddRecipe onSaved={handleSaved} />;
  if (activePage === 'edit') page = <EditRecipe recipeId={editingRecipeId} onSaved={handleSaved} />;
  if (activePage === 'planner') page = <WeeklyPlanner recipes={recipes} onGenerated={() => setActivePage('shopping')} />;
  if (activePage === 'shopping') page = <ShoppingList />;

  return (
    <AppShell activePage={activePage} setActivePage={setActivePage}>
      {page}
    </AppShell>
  );
}
