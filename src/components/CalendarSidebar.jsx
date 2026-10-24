import { ChevronLeft, ChevronRight } from "lucide-react";
import useTodayKey from "../lib/useTodayKey.js";
import { monthGrid, rotatedWeekdays, toKey } from "../lib/dates.js";

export default function CalendarSidebar({
  selected, weekStart, occs, onSelectDay, onShiftMonth,
  categories, hidden, onToggleCategory, onShowAll,
}) {
  const days = monthGrid(selected, weekStart);
  const todayKey = useTodayKey();
  const selectedKey = toKey(selected);
  const busy = new Set();
  occs.forEach((o) => {
    for (const d of days) {
      const k = toKey(d);
      if (o.startKey <= k && o.endKey >= k) busy.add(k);
    }
  });
  const label = selected.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const allVisible = hidden.size === 0;

  return (
    <aside className="calendar-sidebar">
      <div className="mini-calendar">
        <div className="mini-calendar-heading">
          <strong>{label}</strong>
          <span>
            <button type="button" className="icon-button" aria-label="Mini calendar: previous month" onClick={() => onShiftMonth(-1)}><ChevronLeft size={13} /></button>
            <button type="button" className="icon-button" aria-label="Mini calendar: next month" onClick={() => onShiftMonth(1)}><ChevronRight size={13} /></button>
          </span>
        </div>
        <div className="mini-weekdays">
          {rotatedWeekdays(weekStart).map((d) => <span key={d}>{d.slice(0, 2)}</span>)}
        </div>
        <div className="mini-grid">
          {days.map((d) => {
            const key = toKey(d);
            const cls = [];
            if (d.getMonth() !== selected.getMonth()) cls.push("outside");
            if (key === todayKey) cls.push("today");
            if (key === selectedKey) cls.push("selected-day");
            if (busy.has(key)) cls.push("has-event");
            return (
              <button
                type="button"
                key={key}
                className={cls.join(" ")}
                aria-label={d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                onClick={() => onSelectDay(key)}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="filter-panel">
        <h3>Categories</h3>
        <label>
          <input type="checkbox" checked={allVisible} onChange={onShowAll} />
          <span className="filter-dot all" />
          All
        </label>
        {categories.map((c) => (
          <label key={c.id}>
            <input type="checkbox" checked={!hidden.has(c.id)} onChange={() => onToggleCategory(c.id)} />
            <span className="filter-dot" style={{ background: c.color }} />
            {c.name}
          </label>
        ))}
      </div>
    </aside>
  );
}
