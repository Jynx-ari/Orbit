import { monthGrid, rotatedWeekdays, toKey } from "../lib/dates.js";
import { occsOnDay } from "../lib/events.js";
import useTodayKey from "../lib/useTodayKey.js";
import EventChip from "./EventChip.jsx";

const MAX_CHIPS = 3;

export default function MonthView({
  date, weekStart, occs, catColor, hour24, selectedKey,
  onSelectDay, onOpen, onCreate, onShowDay, onMove,
}) {
  const days = monthGrid(date, weekStart);
  const todayKey = useTodayKey();

  function handleDrop(e, key) {
    e.preventDefault();
    const [id, from] = e.dataTransfer.getData("text/plain").split("|");
    if (id && from) onMove(id, from, key);
  }

  return (
    <div className="month-view">
      <div className="weekday-row">
        {rotatedWeekdays(weekStart).map((name) => <span key={name}>{name}</span>)}
      </div>
      <div className="days-grid">
        {days.map((d) => {
          const key = toKey(d);
          const list = occsOnDay(occs, key);
          const shown = list.slice(0, MAX_CHIPS);
          const more = list.length - shown.length;
          const classes = ["day-cell"];
          if (d.getMonth() !== date.getMonth()) classes.push("outside");
          if (key === todayKey) classes.push("today");
          if (key === selectedKey) classes.push("selected");
          return (
            <div
              key={key}
              className={classes.join(" ")}
              onClick={() => onSelectDay(key)}
              onDoubleClick={() => onCreate(key)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, key)}
            >
              <button
                type="button"
                className="day-number"
                aria-current={key === todayKey ? "date" : undefined}
                aria-label={d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                onClick={(e) => { e.stopPropagation(); onSelectDay(key); }}
              >
                {d.getDate()}
              </button>
              {shown.map((o) => (
                <EventChip
                  key={o.key}
                  occ={o}
                  day={key}
                  color={catColor(o.category)}
                  hour24={hour24}
                  onOpen={onOpen}
                  draggable={o.repeat === "none"}
                />
              ))}
              {more > 0 && (
                <button type="button" className="more-link" onClick={(e) => { e.stopPropagation(); onShowDay(key); }}>
                  +{more} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
