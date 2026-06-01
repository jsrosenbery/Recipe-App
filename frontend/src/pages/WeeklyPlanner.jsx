import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, RefreshCw, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, getMonday } from '../lib/api';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEALS = [
  { key: 'main', label: 'Main Dish' },
  { key: 'side_1', label: 'Side 1' },
  { key: 'side_2', label: 'Side 2' }
];

const EMPTY_NUTRITION = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  saturated_fat_g: 0,
  fiber_g: 0,
  sugar_g: 0,
  sodium_mg: 0
};

function keyFor(day, meal) {
  return `${day}-${meal}`;
}

export function WeeklyPlanner({ activePlan, notice, onNotice, onSetActiveWeek, onPlanChange, onGenerated }) {
  const [weekStart, setWeekStart] = useState(activePlan?.week_start || getMonday());
  const [items, setItems] = useState(activePlan?.items || []);
  const [days, setDays] = useState(activePlan?.days || DAYS.map((day) => ({ day_of_week: day, dinner_needed: true })));
  const [nutrition, setNutrition] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activePlan) return;
    setWeekStart(activePlan.week_start);
    setItems(activePlan.items || []);
    setDays(activePlan.days || DAYS.map((day) => ({ day_of_week: day, dinner_needed: true })));
    api.getWeeklyNutrition(activePlan.week_start).then(setNutrition).catch(() => setNutrition(null));
  }, [activePlan]);

  const itemMap = useMemo(() => {
    const map = new Map();
    items.forEach((item) => map.set(keyFor(item.day_of_week, item.meal_type), item));
    return map;
  }, [items]);

  const dayMap = useMemo(() => {
    const map = new Map();
    days.forEach((day) => map.set(day.day_of_week, day.dinner_needed));
    return map;
  }, [days]);

  async function activateWeek() {
    setSaving(true);
    const plan = await onSetActiveWeek(weekStart);
    setSaving(false);
    return plan;
  }

  function setSlot(item, day, meal) {
    const sourceKey = keyFor(item.day_of_week, item.meal_type);
    const targetKey = keyFor(day, meal);
    if (sourceKey === targetKey) return;

    const targetItem = itemMap.get(targetKey);
    setItems((current) => current.map((candidate) => {
      if (candidate.id === item.id) return { ...candidate, day_of_week: day, meal_type: meal };
      if (targetItem && candidate.id === targetItem.id) return { ...candidate, day_of_week: item.day_of_week, meal_type: item.meal_type };
      return candidate;
    }));
  }

  function moveItem(item, dayDelta, mealDelta) {
    const dayIndex = DAYS.indexOf(item.day_of_week);
    const mealIndex = MEALS.findIndex((meal) => meal.key === item.meal_type);
    const nextDay = DAYS[dayIndex + dayDelta];
    const nextMeal = MEALS[mealIndex + mealDelta]?.key;
    if (!nextDay || !nextMeal) return;
    setSlot(item, nextDay, nextMeal);
  }

  function removeItem(item) {
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
  }

  async function toggleDinner(dayOfWeek) {
    const nextValue = !dayMap.get(dayOfWeek);
    const updatedDays = days.map((day) => day.day_of_week === dayOfWeek ? { ...day, dinner_needed: nextValue } : day);
    setDays(updatedDays);
    const plan = await api.updateDinnerNeeded(weekStart, dayOfWeek, nextValue);
    onPlanChange(plan);
    const summary = await api.getWeeklyNutrition(weekStart);
    setNutrition(summary);
  }

  async function savePlan() {
    setSaving(true);
    const plan = await api.saveMealPlanItems(weekStart, items);
    onPlanChange(plan);
    const summary = await api.getWeeklyNutrition(weekStart);
    setNutrition(summary);
    onNotice('Planner saved.');
    setSaving(false);
  }

  async function clearPlan() {
    const confirmed = window.confirm('Clear every main dish and side for this week?');
    if (!confirmed) return;

    setSaving(true);
    setItems([]);
    const plan = await api.saveMealPlanItems(weekStart, []);
    onPlanChange(plan);
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
          {notice && <p className="status-message">{notice}</p>}
        </div>
        <div className="active-week-controls">
          <label className="week-picker">
            Week of
            <input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} />
          </label>
          <button className="primary-action" onClick={activateWeek} disabled={saving}>Mark active</button>
        </div>
      </header>

      <div className="planner-grid dinner-planner-grid card-planner-grid">
        <div className="planner-head" />
        {MEALS.map((meal) => <strong key={meal.key}>{meal.label}</strong>)}
        {DAYS.map((day) => {
          const dinnerNeeded = dayMap.get(day) !== false;
          return (
            <div className={`planner-row ${dinnerNeeded ? '' : 'dinner-off'}`} key={day}>
              <div className="day-cell">
                <strong className="day-label">{day}</strong>
                <label className="dinner-toggle">
                  <input type="checkbox" checked={dinnerNeeded} onChange={() => toggleDinner(day)} />
                  Dinner needed
                </label>
              </div>
              {MEALS.map((meal) => {
                const item = itemMap.get(keyFor(day, meal.key));
                return (
                  <div className="planner-slot" key={meal.key}>
                    {item ? (
                      <article className="planner-card">
                        <strong>{item.title}</strong>
                        <span>{meal.label}</span>
                        <div className="planner-card-actions">
                          <button type="button" title="Move up" onClick={() => moveItem(item, -1, 0)}><ArrowUp size={14} /></button>
                          <button type="button" title="Move down" onClick={() => moveItem(item, 1, 0)}><ArrowDown size={14} /></button>
                          <button type="button" title="Move left" onClick={() => moveItem(item, 0, -1)}><ArrowLeft size={14} /></button>
                          <button type="button" title="Move right" onClick={() => moveItem(item, 0, 1)}><ArrowRight size={14} /></button>
                          <button type="button" title="Remove" onClick={() => removeItem(item)}><X size={14} /></button>
                        </div>
                      </article>
                    ) : (
                      <span className="empty-slot">Add from library</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="action-row">
        <button className="primary-action" onClick={savePlan} disabled={saving}><Save size={18} /> Save plan</button>
        <button onClick={clearPlan} disabled={saving || !items.length}><RotateCcw size={18} /> Clear plan</button>
        <button onClick={generateShoppingList} disabled={saving}><RefreshCw size={18} /> Generate shopping list</button>
      </div>

      <NutritionSummary nutrition={nutrition || EMPTY_NUTRITION} />
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
