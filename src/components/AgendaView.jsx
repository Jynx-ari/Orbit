import { CalendarPlus } from "lucide-react";
import { fromKey, longDate } from "../lib/dates.js";
import useTodayKey from "../lib/useTodayKey.js";
import { REPEAT_OPTIONS, compareOccs, timeLabel } from "../lib/events.js";

const repeatName = Object.fromEntries(REPEAT_OPTIONS);

export default function AgendaView({ fromDay, occs, categoryName, catColor, hour24, searching, onOpen, onCreate }) {
  const groups = new Map();
  for (const o of occs) {
    const day = o.startKey < fromDay ? fromDay : o.startKey;
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(o);
  }
  const days = [...groups.keys()].sort();
  const todayKey = useTodayKey();

  if (!days.length) {
    return (
      <div className="empty-state">
        <CalendarPlus size={28} />
        <h3>{searching ? "No matching events" : "Nothing coming up"}</h3>
        <p>
          {searching
            ? "No events match your search in the next 90 days."
            : "You have no events in the next 90 days."}
        </p>
        {!searching && (
          <button type="button" className="primary-button" onClick={() => onCreate(fromDay)}>New event</button>
        )}
      </div>
    );
  }

  return (
    <div className="agenda">
      {days.map((day) => (
        <section className="agenda-day" key={day}>
          <h3>
            {day === todayKey && <span className="agenda-today">Today</span>}
            {longDate(fromKey(day))}
          </h3>
          {groups.get(day).sort(compareOccs).map((o) => (
            <button type="button" className="agenda-row" key={o.key} style={{ "--chip": catColor(o.category) }} onClick={() => onOpen(o)}>
              <span className="agenda-time">{timeLabel(o, hour24)}</span>
              <span className="agenda-main">
                <strong>{o.title}</strong>
                <small>
                  {categoryName(o.category)}
                  {o.repeat !== "none" ? ` · ${repeatName[o.repeat]}` : ""}
                </small>
                {o.description && <em>{o.description}</em>}
              </span>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}
