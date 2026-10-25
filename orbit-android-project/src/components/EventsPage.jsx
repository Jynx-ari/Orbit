import { CalendarPlus, Pencil } from "lucide-react";
import { formatTime, shortDate } from "../lib/dates.js";
import { REPEAT_OPTIONS } from "../lib/events.js";

const repeatName = Object.fromEntries(REPEAT_OPTIONS);

function whenLabel(ev, hour24) {
  const dates = ev.startDate === ev.endDate ? shortDate(ev.startDate) : `${shortDate(ev.startDate)} – ${shortDate(ev.endDate)}`;
  const year = ev.startDate.slice(0, 4);
  return ev.allDay ? `${dates}, ${year} · All day` : `${dates}, ${year} · ${formatTime(ev.startTime, hour24)} – ${formatTime(ev.endTime, hour24)}`;
}

export default function EventsPage({ events, totalCount, categoryName, catColor, hour24, searching, onOpen, onCreate }) {
  if (!events.length) {
    return (
      <div className="empty-state">
        <CalendarPlus size={28} />
        <h3>{searching ? "No matching events" : "No events yet"}</h3>
        <p>{searching ? "Try a different search." : "Events you create will be listed here so you can find, edit or delete them."}</p>
        {!searching && <button type="button" className="primary-button" onClick={() => onCreate()}>New event</button>}
      </div>
    );
  }
  return (
    <div className="page-body">
      <p className="hint">
        {searching ? `${events.length} of ${totalCount} events` : `${totalCount} event${totalCount === 1 ? "" : "s"}`}, sorted by start date. Repeating events are listed once.
      </p>
      <ul className="event-list">
        {events.map((ev) => (
          <li key={ev.id} style={{ "--chip": catColor(ev.category) }}>
            <span className="event-swatch" />
            <div className="event-list-main">
              <strong>{ev.title}</strong>
              <small>
                {whenLabel(ev, hour24)} · {categoryName(ev.category)}
                {ev.repeat !== "none" ? ` · ${repeatName[ev.repeat]}` : ""}
              </small>
            </div>
            <button type="button" className="secondary-button" onClick={() => onOpen(ev)} aria-label={`Edit ${ev.title}`}>
              <Pencil size={13} /> Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
