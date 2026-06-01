import { BookOpen, CalendarDays, ClipboardList, PlusCircle, Utensils } from 'lucide-react';

const NAV = [
  { key: 'library', label: 'Library', icon: BookOpen },
  { key: 'add', label: 'Add Recipe', icon: PlusCircle },
  { key: 'planner', label: 'Planner', icon: CalendarDays },
  { key: 'shopping', label: 'Shopping', icon: ClipboardList }
];

export function AppShell({ activePage, setActivePage, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Utensils size={26} />
          <div>
            <strong>Recipe Planner</strong>
            <span>Personal kitchen hub</span>
          </div>
        </div>
        <nav>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={activePage === item.key ? 'active' : ''}
                onClick={() => setActivePage(item.key)}
                title={item.label}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}
