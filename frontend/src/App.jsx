import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { api, getMonday } from './lib/api';
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
  const [activePlan, setActivePlan] = useState(null);
  const [plannerNotice, setPlannerNotice] = useState('');

  async function refreshRecipes() {
    setRecipes(await api.listRecipes());
  }

  async function refreshActivePlan() {
    const plan = await api.getActiveMealPlan();
    if (plan) {
      setActivePlan(plan);
      return plan;
    }
    const newPlan = await api.setActiveMealPlan(getMonday());
    setActivePlan(newPlan);
    return newPlan;
  }

  useEffect(() => {
    refreshRecipes().catch(console.error);
    refreshActivePlan().catch(console.error);
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
    refreshActivePlan();
  }

  async function handleSetActiveWeek(weekStart) {
    const plan = await api.setActiveMealPlan(weekStart);
    setActivePlan(plan);
    setPlannerNotice(`Active week set to ${weekStart}.`);
  }

  async function handleAddToActivePlan(recipe) {
    try {
      const plan = await api.addRecipeToActiveMealPlan(recipe.id);
      setActivePlan(plan);
      setPlannerNotice(`Added ${recipe.title} to the active week.`);
    } catch (error) {
      setPlannerNotice(error.message);
    }
  }

  let page = (
    <RecipeLibrary
      recipes={recipes}
      activePlan={activePlan}
      notice={plannerNotice}
      onAdd={() => setActivePage('add')}
      onEdit={(id) => { setEditingRecipeId(id); setActivePage('edit'); }}
      onDelete={handleDelete}
      onAddToActivePlan={handleAddToActivePlan}
    />
  );

  if (activePage === 'add') page = <AddRecipe onSaved={handleSaved} />;
  if (activePage === 'edit') page = <EditRecipe recipeId={editingRecipeId} onSaved={handleSaved} />;
  if (activePage === 'planner') page = (
    <WeeklyPlanner
      activePlan={activePlan}
      notice={plannerNotice}
      onNotice={setPlannerNotice}
      onSetActiveWeek={handleSetActiveWeek}
      onPlanChange={setActivePlan}
      onGenerated={() => setActivePage('shopping')}
    />
  );
  if (activePage === 'shopping') page = <ShoppingList />;

  return (
    <AppShell activePage={activePage} setActivePage={setActivePage}>
      {page}
    </AppShell>
  );
}
