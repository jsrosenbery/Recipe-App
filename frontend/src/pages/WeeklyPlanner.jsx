import { RotateCcw, RefreshCw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, getMonday } from '../lib/api';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEALS = [
  { key: 'main', label: 'Main Dish' },
  { key: 'side_1', label: 'Side 1' },
  { key: 'side_2', label: 'Side 2' }
];

export function WeeklyPlanner({ recipes, onGenerated }) {
  const [weekStart, setWeekStart] = useState(getMonday());
  const [items, setItems] = useState([]);
  const [nutrition, setNutrition] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getMealPlan(weekStart).then((plan) => setItems((plan.items || []).filter((item) => MEALS.some((meal) => meal.key === item.meal_type))));
    api.getWeeklyNutrition(weekStart).then(setNutrition).catch(() => setNutrition(null));
  }, [weekStart]);

  const itemMap = useMemo(() => {
    const map = new Map();
    items.forEach((item) => map.set(`${item.day_of_week}-${item.meal_type}`, item));
    return map;
  }, [items]);

  function updateSlot(day, meal, recipeId) {
    const key = `${day}-${meal}`;
    const existing = itemMap.get(key);
    const next = items.filter((item) => `${item.day_of_week}-${item.meal_type}` !== key);
    if (recipeId) {
      next.push({
        ...existing,
        day_of_week: day,
        meal_type: meal,
        recipe_id: recipeId,
        servings: existing?.servings || null
      });
    }
    setItems(next);
  }

  async function savePlan() {
    setSaving(true);
    await api.saveMealPlanItems(weekStart, items);
    const summary = await api.getWeeklyNutrition(weekStart);
    setNutrition(summary);
    setSaving(false);
  }

  async function clearPlan() {
    const confirmed = window.confirm('Clear every main dish and side for this week?');
    if (!confirmed) return;

    setSaving(true);
    setItems([]);
    await api.saveMealPlanItems(weekStart, []);
    const summary = await api.getWeeklyNutrition(weekStart);
    setNutrition(summary);
    setSaving(false);
  }

  async function generateShoppingList() {
    await savePlan();
    await api.generateShoppingList(weekStart);
    onGenerated(weekStart);
  }

  return (
    <section className="page planner-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Weekly meal planner</p>
          <h1>Plan dinners</h1>
        </div>
        <label className="week-picker">
          Week of
          <input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} />
        </label>
      </header>

      <div className="planner-grid dinner-planner-grid">
        <div className="planner-head" />
        {MEALS.map((meal) => <strong key={meal.key}>{meal.label}</strong>)}
        {DAYS.map((day) => (
          <div className="planner-row" key={day}>
            <strong className="day-label">{day}</strong>
            {MEALS.map((meal) => {
              const item = itemMap.get(`${day}-${meal.key}`);
              return (
                <select key={meal.key} value={item?.recipe_id || ''} onChange={(event) => updateSlot(day, meal.key, event.target.value)}>
                  <option value="">Empty</option>
                  {recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}
                </select>
              );
            })}
          </div>
        ))}
      </div>

      <div className="action-row">
        <button className="primary-action" onClick={savePlan} disabled={saving}><Save size={18} /> Save plan</button>
        <button onClick={clearPlan} disabled={saving || !items.length}><RotateCcw size={18} /> Clear plan</button>
        <button onClick={generateShoppingList} disabled={saving}><RefreshCw size={18} /> Generate shopping list</button>
      </div>

      <NutritionSummary nutrition={nutrition} />
    </section>
  );
}

function NutritionSummary({ nutrition }) {
  const rows = [
    ['Calories', 'calories'],
    ['Protein', 'protein_g'],
    ['Carbs', 'carbs_g'],
    ['Fat', 'fat_g'],
    ['Saturated fat', 'saturated_fat_g'],
    ['Fiber', 'fiber_g'],
    ['Sugar', 'sugar_g'],
    ['Sodium', 'sodium_mg']
  ];

  return (
    <section className="summary-panel">
      <h2>Weekly nutrition estimate</h2>
      <div className="nutrition-cards">
        {rows.map(([label, key]) => (
          <div key={key}>
            <span>{label}</span>
            <strong>{Math.round(Number(nutrition?.[key] || 0))}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
