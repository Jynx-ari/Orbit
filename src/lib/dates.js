// Date helpers. Dates are handled as local-time "YYYY-MM-DD" keys so that
// events never shift because of time zones or daylight saving changes.

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const pad = (n) => String(n).padStart(2, "0");

export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isValidKey(key) {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return toKey(fromKey(key)) === key;
}

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// Move by whole months, clamping the day (Jan 31 + 1 month = Feb 28/29).
export function shiftMonth(date, n) {
  const target = new Date(date.getFullYear(), date.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), last));
}

export const daysBetween = (aKey, bKey) => Math.round((fromKey(bKey) - fromKey(aKey)) / 86400000);

export function startOfWeek(date, weekStart = 0) {
  return addDays(date, -((date.getDay() - weekStart + 7) % 7));
}

export function weekDays(date, weekStart = 0) {
  const start = startOfWeek(date, weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// Always 6 weeks (42 days) so the month grid keeps a steady height.
export function monthGrid(date, weekStart = 0) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first, weekStart);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function rotatedWeekdays(weekStart = 0) {
  return [...WEEKDAYS.slice(weekStart), ...WEEKDAYS.slice(0, weekStart)];
}

export const timeToMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const minutesToTime = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

export const addMinutesToTime = (t, mins) =>
  minutesToTime(Math.min(timeToMinutes(t) + mins, 23 * 60 + 59));

export function formatTime(t, hour24 = false) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (hour24) return `${pad(h)}:${pad(m)}`;
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

export const formatHour = (h, hour24 = false) =>
  hour24 ? `${pad(h)}:00` : `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;

export const shortDate = (key) =>
  fromKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const longDate = (d) =>
  d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export function rangeLabel(view, date, weekStart) {
  if (view === "month") {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  if (view === "week") {
    const days = weekDays(date, weekStart);
    const a = days[0];
    const b = days[6];
    const opts = { month: "short", day: "numeric" };
    if (a.getFullYear() !== b.getFullYear()) {
      return `${a.toLocaleDateString("en-US", { ...opts, year: "numeric" })} – ${b.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
    }
    if (a.getMonth() === b.getMonth()) {
      return `${a.toLocaleDateString("en-US", opts)} – ${b.getDate()}, ${b.getFullYear()}`;
    }
    return `${a.toLocaleDateString("en-US", opts)} – ${b.toLocaleDateString("en-US", opts)}, ${b.getFullYear()}`;
  }
  if (view === "day") return longDate(date);
  return "Upcoming events";
}
