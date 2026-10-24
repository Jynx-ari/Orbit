import { useState } from "react";
import Modal from "./Modal.jsx";
import { addDays, addMinutesToTime, daysBetween, fromKey, isValidKey, shortDate, toKey } from "../lib/dates.js";
import { REMINDER_OPTIONS, REPEAT_OPTIONS, validateEvent } from "../lib/events.js";

// event: existing event or blank draft (id === null). occurrence: the date that was clicked.
export default function EventModal({ event, occurrence, categories, onSave, onDelete, onClose }) {
  const isNew = !event.id;
  const isSeries = !isNew && event.repeat !== "none";
  const occStart = occurrence || event.startDate;

  const [form, setForm] = useState(() => {
    if (isSeries) {
      const span = daysBetween(event.startDate, event.endDate);
      return { ...event, startDate: occStart, endDate: toKey(addDays(fromKey(occStart), span)) };
    }
    return { ...event };
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null); // null | "save" | "delete"

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  function changeStartDate(value) {
    setForm((f) => {
      if (!isValidKey(value) || !isValidKey(f.startDate) || !isValidKey(f.endDate)) {
        return { ...f, startDate: value };
      }
      // Keep the event's length when its start date moves.
      const delta = daysBetween(f.startDate, value);
      return { ...f, startDate: value, endDate: toKey(addDays(fromKey(f.endDate), delta)) };
    });
  }

  function changeStartTime(value) {
    setForm((f) => {
      const next = { ...f, startTime: value };
      if (f.startDate === f.endDate && /^\d\d:\d\d$/.test(value) && f.endTime <= value) {
        next.endTime = addMinutesToTime(value, 60);
      }
      return next;
    });
  }

  const clean = () => ({
    ...form,
    title: form.title.trim(),
    description: form.description.trim(),
    repeatUntil: form.repeat === "none" ? "" : form.repeatUntil,
  });

  function submit(e) {
    e.preventDefault();
    const message = validateEvent(form);
    setError(message);
    if (message) return;
    if (isSeries) setPending("save");
    else onSave(clean(), "all", occStart);
  }

  const when = shortDate(occStart);

  return (
    <Modal title={isNew ? "New event" : "Edit event"} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        <div className="modal-body">
          <label className="field">
            <span>Title</span>
            <input
              data-autofocus
              value={form.title}
              maxLength={200}
              placeholder="Event title"
              onChange={(e) => set("title", e.target.value)}
            />
          </label>

          <label className="check">
            <input type="checkbox" checked={form.allDay} onChange={(e) => set("allDay", e.target.checked)} />
            All-day event
          </label>

          <div className="field-row">
            <label className="field">
              <span>Starts</span>
              <input type="date" value={form.startDate} onChange={(e) => changeStartDate(e.target.value)} />
            </label>
            {!form.allDay && (
              <label className="field">
                <span>Start time</span>
                <input type="time" value={form.startTime} onChange={(e) => changeStartTime(e.target.value)} />
              </label>
            )}
          </div>
          <div className="field-row">
            <label className="field">
              <span>Ends</span>
              <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => set("endDate", e.target.value)} />
            </label>
            {!form.allDay && (
              <label className="field">
                <span>End time</span>
                <input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
              </label>
            )}
          </div>

          <div className="field-row">
            <label className="field">
              <span>Category</span>
              <select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Reminder</span>
              <select value={form.reminder} onChange={(e) => set("reminder", Number(e.target.value))}>
                {REMINDER_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          {form.allDay && form.reminder >= 0 && <p className="hint">Reminders for all-day events appear at 9:00 AM.</p>}

          <div className="field-row">
            <label className="field">
              <span>Repeat</span>
              <select value={form.repeat} onChange={(e) => set("repeat", e.target.value)}>
                {REPEAT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            {form.repeat !== "none" && (
              <label className="field">
                <span>Repeat until (optional)</span>
                <input type="date" value={form.repeatUntil} min={form.startDate} onChange={(e) => set("repeatUntil", e.target.value)} />
              </label>
            )}
          </div>

          <label className="field">
            <span>Notes (optional)</span>
            <textarea rows={3} value={form.description} maxLength={5000} onChange={(e) => set("description", e.target.value)} />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        {pending === null && (
          <div className="modal-footer">
            {isNew ? <span /> : (
              <button type="button" className="danger-button" onClick={() => setPending("delete")}>Delete</button>
            )}
            <div className="footer-actions">
              <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary-button">Save</button>
            </div>
          </div>
        )}

        {pending === "save" && (
          <div className="scope-panel">
            <p>This is a repeating event. Apply your changes to…</p>
            <div className="footer-actions">
              <button type="button" className="secondary-button" onClick={() => setPending(null)}>Back</button>
              <button type="button" className="secondary-button" onClick={() => onSave(clean(), "this", occStart)}>Only {when}</button>
              <button type="button" className="primary-button" onClick={() => onSave(clean(), "all", occStart)}>All events</button>
            </div>
          </div>
        )}

        {pending === "delete" && (
          <div className="scope-panel">
            <p>{isSeries ? "This is a repeating event. Delete…" : "Delete this event? This can't be undone."}</p>
            <div className="footer-actions">
              <button type="button" className="secondary-button" data-autofocus onClick={() => setPending(null)}>Back</button>
              {isSeries && (
                <button type="button" className="danger-button" onClick={() => onDelete("this", occStart)}>Only {when}</button>
              )}
              <button type="button" className="danger-button" onClick={() => onDelete("all", occStart)}>
                {isSeries ? "All events" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
