import { useEffect, useMemo, useState } from 'react';
import { Plus, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { api, getMonday } from '../lib/api';

const emptyList = { items: [] };

function dateOnly(value) {
  return String(value || getMonday()).slice(0, 10);
}

export function ShoppingList({ initialWeekStart }) {
  const [weekStart, setWeekStart] = useState(dateOnly(initialWeekStart));
  const [list, setList] = useState(emptyList);
  const [manualItem, setManualItem] = useState('');

  useEffect(() => {
    setWeekStart(dateOnly(initialWeekStart));
  }, [initialWeekStart]);

  useEffect(() => {
    loadList();
  }, [weekStart]);

  async function loadList() {
    setList((await api.getShoppingList(weekStart)) || emptyList);
  }

  async function generate() {
    setList((await api.generateShoppingList(weekStart)) || emptyList);
  }

  async function toggle(item) {
    await api.updateShoppingItem(item.id, { checked: !item.checked });
    loadList();
  }

  async function addManualItem() {
    if (!manualItem || !list.id) return;
    await api.addShoppingItem(list.id, manualItem);
    setManualItem('');
    loadList();
  }

  async function removeItem(itemId) {
    await api.deleteShoppingItem(itemId);
    loadList();
  }

  const items = list?.items || [];
  const grouped = useMemo(() => {
    return items.reduce((acc, item) => {
      acc[item.category] ||= [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [items]);

  return (
    <section className="page shopping-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Shopping list</p>
          <h1>Grocery run</h1>
        </div>
        <label className="week-picker">
          Week of
          <input type="date" value={dateOnly(weekStart)} onChange={(event) => setWeekStart(dateOnly(event.target.value))} />
        </label>
      </header>

      <div className="action-row">
        <button className="primary-action" onClick={generate}><RefreshCw size={18} /> Regenerate</button>
        <button onClick={() => window.print()}><Printer size={18} /> Print</button>
      </div>

      {list?.id && (
        <div className="import-bar">
          <input placeholder="Add an item" value={manualItem} onChange={(event) => setManualItem(event.target.value)} />
          <button onClick={addManualItem}><Plus size={18} /> Add</button>
        </div>
      )}

      <div className="shopping-groups">
        {Object.entries(grouped).map(([category, categoryItems]) => (
          <section className="shopping-group" key={category}>
            <h2>{category}</h2>
            {categoryItems.map((item) => (
              <div className="shopping-item" key={item.id}>
                <label>
                  <input type="checkbox" checked={item.checked} onChange={() => toggle(item)} />
                  <span className={item.checked ? 'checked' : ''}>{item.raw_text}</span>
                </label>
                <button title="Remove item" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
              </div>
            ))}
          </section>
        ))}
      </div>

      {!items.length && (
        <div className="empty-state">
          <h2>No shopping list yet</h2>
          <p>Generate one from your weekly meal plan, then add or check off items here.</p>
        </div>
      )}
    </section>
  );
}
