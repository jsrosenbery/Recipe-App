import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { api, getMonday } from './lib/api';
import { AddRecipe } from './pages/AddRecipe';
import { EditRecipe } from './pages/EditRecipe';
import { RecipeLibrary } from './pages/RecipeLibrary';
import { ShoppingList } from './pages/ShoppingList';
import { WeeklyPlanner } from './pages/WeeklyPlanner';
import './styles.css';

function dateOnly(value) {
  return String(value || getMonday()).slice(0, 10);
}

export default function App() {
  const [activePage, setActivePage] = useState('library');
  const [recipes, setRecipes] = useState([]);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [plannerNotice, setPlannerNotice] = useState('');
  const [shoppingWeekStart, setShoppingWeekStart] = useState(getMonday());

  async function refreshRecipes() {
    setRecipes(await api.listRecipes());
  }

  async function refreshActivePlan() {
    const newPlan = await api.setActiveMealPlan(getMonday());
    setActivePlan(newPlan);
    setShoppingWeekStart(dateOnly(newPlan?.week_start));
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
    const plan = await api.setActiveMealPlan(dateOnly(weekStart));
    setActivePlan(plan);
    setShoppingWeekStart(dateOnly(plan?.week_start));
    setPlannerNotice(`Active week set to ${dateOnly(plan?.week_start)}.`);
    return plan;
  }

  async function handleAddToActivePlan(recipe) {
    try {
      const plan = await api.addRecipeToActiveMealPlan(recipe.id);
      setActivePlan(plan);
      setShoppingWeekStart(dateOnly(plan?.week_start));
      setPlannerNotice(`Added ${recipe.title} to the active week.`);
      setActivePage('planner');
    } catch (error) {
      setPlannerNotice(error.message);
    }
  }

  function handleGeneratedShoppingList(weekStart) {
    setShoppingWeekStart(dateOnly(weekStart));
    setActivePage('shopping');
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
      onGenerated={handleGeneratedShoppingList}
    />
  );
  if (activePage === 'shopping') page = <ShoppingList initialWeekStart={shoppingWeekStart} />;

  return (
    <AppShell activePage={activePage} setActivePage={setActivePage}>
      {page}
    </AppShell>
  );
}
