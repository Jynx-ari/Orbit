import {
  addDays,
  addMinutesToTime,
  daysBetween,
  formatTime,
  fromKey,
  isValidKey,
  shortDate,
  timeToMinutes,
  toKey,
} from "./dates.js";

export const OTHER_ID = "other";
export const MAX_EVENTS = 20000;

export const REPEAT_OPTIONS = [
  ["none", "Does not repeat"],
  ["daily", "Daily"],
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
  ["yearly", "Yearly"],
];

export const REMINDER_OPTIONS = [
  [-1, "No reminder"],
  [0, "At time of event"],
  [5, "5 minutes before"],
  [10, "10 minutes before"],
  [15, "15 minutes before"],
  [30, "30 minutes before"],
  [60, "1 hour before"],
  [1440, "1 day before"],
];

export const DEFAULT_CATEGORIES = [
  { id: "personal", name: "Personal", color: "#36cda1" },
  { id: "school", name: "School", color: "#e3b51b" },
  { id: "projects", name: "Projects", color: "#a58de8" },
  { id: OTHER_ID, name: "Other", color: "#8a8a8a" },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const COLOR_RE = /^#[0-9a-f]{6}$/i;
const REPEATS = REPEAT_OPTIONS.map(([v]) => v);
const REMINDERS = REMINDER_OPTIONS.map(([v]) => v);

export function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export const defaultData = () => ({
  events: [],
  categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
});

export function blankEvent(dateKey, startTime = "09:00", allDay = false) {
  return {
    id: null,
    title: "",
    startDate: dateKey,
    endDate: dateKey,
    allDay,
    startTime,
    endTime: addMinutesToTime(startTime, 60),
    category: DEFAULT_CATEGORIES[0].id,
    description: "",
    repeat: "none",
    repeatUntil: "",
    reminder: -1,
    exceptions: [],
  };
}

// Returns an error message, or "" when the event is fine to save.
export function validateEvent(e) {
  if (!e.title.trim()) return "Give your event a title.";
  if (!isValidKey(e.startDate) || !isValidKey(e.endDate)) return "Choose a valid start and end date.";
  if (e.endDate < e.startDate) return "The end date can't be before the start date.";
  if (!e.allDay) {
    if (!TIME_RE.test(e.startTime) || !TIME_RE.test(e.endTime)) return "Enter a start and end time.";
    if (e.endDate === e.startDate && e.endTime <= e.startTime) {
      return "The end time must be after the start time.";
    }
  }
  if (e.repeat !== "none" && e.repeatUntil) {
    if (!isValidKey(e.repeatUntil)) return "Choose a valid date for when the repeat ends.";
    if (e.repeatUntil < e.startDate) return "The repeat can't end before the event starts.";
  }
  return "";
}

// ---------------------------------------------------------------- recurrence

function occurrenceStart(ev, i) {
  const s = fromKey(ev.startDate);
  switch (ev.repeat) {
    case "daily":
      return addDays(s, i);
    case "weekly":
      return addDays(s, 7 * i);
    case "monthly": {
      const t = new Date(s.getFullYear(), s.getMonth() + i, 1);
      const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
      return new Date(t.getFullYear(), t.getMonth(), Math.min(s.getDate(), last));
    }
    default: {
      const y = s.getFullYear() + i;
      const last = new Date(y, s.getMonth() + 1, 0).getDate();
      return new Date(y, s.getMonth(), Math.min(s.getDate(), last));
    }
  }
}

const occurrence = (ev, startKey, endKey) => ({ ...ev, key: `${ev.id}@${startKey}`, startKey, endKey });

// Every occurrence that touches [rangeStart, rangeEnd] (both "YYYY-MM-DD").
export function expandEvents(events, rangeStart, rangeEnd) {
  const out = [];
  for (const ev of events) {
    const span = daysBetween(ev.startDate, ev.endDate);
    if (ev.repeat === "none") {
      if (ev.startDate <= rangeEnd && ev.endDate >= rangeStart) {
        out.push(occurrence(ev, ev.startDate, ev.endDate));
      }
      continue;
    }
    const step = ev.repeat === "daily" ? 1 : ev.repeat === "weekly" ? 7 : 0;
    let i = 0;
    if (step) i = Math.max(0, Math.floor((daysBetween(ev.startDate, rangeStart) - span) / step));
    for (let n = 0; n < 20000; n++, i++) {
      const start = occurrenceStart(ev, i);
      const startKey = toKey(start);
      if (startKey > rangeEnd) break;
      if (ev.repeatUntil && startKey > ev.repeatUntil) break;
      const endKey = toKey(addDays(start, span));
      if (endKey < rangeStart || ev.exceptions.includes(startKey)) continue;
      out.push(occurrence(ev, startKey, endKey));
    }
  }
  return out;
}

// Banner events (all-day or multi-day) are drawn above timed events.
export const isBanner = (o) => o.allDay || o.startKey !== o.endKey;

export function compareOccs(a, b) {
  const ab = isBanner(a);
  const bb = isBanner(b);
  if (ab !== bb) return ab ? -1 : 1;
  const at = a.allDay ? "" : a.startTime;
  const bt = b.allDay ? "" : b.startTime;
  return at.localeCompare(bt) || a.title.localeCompare(b.title);
}

export const occsOnDay = (occs, key) =>
  occs.filter((o) => o.startKey <= key && o.endKey >= key).sort(compareOccs);

export function timeLabel(o, hour24) {
  const multi = o.startKey !== o.endKey;
  if (o.allDay) return multi ? `All day · ${shortDate(o.startKey)} – ${shortDate(o.endKey)}` : "All day";
  if (multi) {
    return `${shortDate(o.startKey)} ${formatTime(o.startTime, hour24)} – ${shortDate(o.endKey)} ${formatTime(o.endTime, hour24)}`;
  }
  return `${formatTime(o.startTime, hour24)} – ${formatTime(o.endTime, hour24)}`;
}

// Side-by-side layout for overlapping timed events in one day column.
export function layoutDay(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = [];
    cluster.forEach((it) => {
      let c = cols.findIndex((end) => end <= it.start);
      if (c === -1) {
        c = cols.length;
        cols.push(it.end);
      } else {
        cols[c] = it.end;
      }
      it.col = c;
    });
    cluster.forEach((it) => {
      it.cols = cols.length;
      out.push(it);
    });
    cluster = [];
  };
  for (const it of sorted) {
    if (cluster.length && it.start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length) flush();
  return out;
}

export function dayBlocks(dayOccs) {
  return layoutDay(
    dayOccs
      .filter((o) => !isBanner(o))
      .map((o) => {
        const start = timeToMinutes(o.startTime);
        const end = Math.min(1440, Math.max(timeToMinutes(o.endTime), start + 30));
        return { occ: o, start, end };
      }),
  );
}

// ------------------------------------------------------- validation / storage

export function sanitizeCategory(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" ? raw.id.trim().slice(0, 64) : "";
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 40) : "";
  if (!id || !name || !COLOR_RE.test(raw.color)) return null;
  return { id, name, color: raw.color.toLowerCase() };
}

export function sanitizeEvent(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 200) : "";
  if (!title || !isValidKey(raw.startDate)) return null;
  const endDate = isValidKey(raw.endDate) && raw.endDate >= raw.startDate ? raw.endDate : raw.startDate;
  const startTime = TIME_RE.test(raw.startTime) ? raw.startTime : "09:00";
  let endTime = TIME_RE.test(raw.endTime) ? raw.endTime : "10:00";
  if (endDate === raw.startDate && endTime < startTime) endTime = startTime;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id.slice(0, 64) : uid(),
    title,
    startDate: raw.startDate,
    endDate,
    allDay: raw.allDay === true,
    startTime,
    endTime,
    category: typeof raw.category === "string" ? raw.category : OTHER_ID,
    description: typeof raw.description === "string" ? raw.description.slice(0, 5000) : "",
    repeat: REPEATS.includes(raw.repeat) ? raw.repeat : "none",
    repeatUntil: isValidKey(raw.repeatUntil) ? raw.repeatUntil : "",
    reminder: REMINDERS.includes(raw.reminder) ? raw.reminder : -1,
    exceptions: Array.isArray(raw.exceptions) ? raw.exceptions.filter(isValidKey).slice(0, 5000) : [],
  };
}

// Throws an Error with a friendly message when the data can't be used at all.
export function sanitizeData(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.events)) {
    throw new Error("This file doesn't look like an Orbit backup.");
  }
  if (typeof raw.version === "number" && raw.version > 1) {
    throw new Error("This backup was made by a newer version of Orbit.");
  }
  if (raw.events.length > MAX_EVENTS) throw new Error("This backup has too many events to import.");

  let categories = Array.isArray(raw.categories) ? raw.categories.map(sanitizeCategory).filter(Boolean) : [];
  if (!categories.length) categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  const byId = new Map(categories.map((c) => [c.id, c]));
  if (!byId.has(OTHER_ID)) {
    const other = { ...DEFAULT_CATEGORIES.find((c) => c.id === OTHER_ID) };
    byId.set(OTHER_ID, other);
  }

  const events = new Map();
  let skipped = 0;
  for (const item of raw.events) {
    const ev = sanitizeEvent(item);
    if (!ev) {
      skipped += 1;
      continue;
    }
    if (!byId.has(ev.category)) ev.category = OTHER_ID;
    events.set(ev.id, ev);
  }
  return { data: { events: [...events.values()], categories: [...byId.values()] }, skipped };
}

export const buildBackup = (data) => ({
  app: "orbit",
  version: 1,
  exportedAt: new Date().toISOString(),
  events: data.events,
  categories: data.categories,
});

const DATA_KEY = "orbit.data.v1";
const SETTINGS_KEY = "orbit.settings.v1";
const FIRED_KEY = "orbit.fired.v1";

export function storageAvailable() {
  try {
    localStorage.setItem("orbit.test", "1");
    localStorage.removeItem("orbit.test");
    return true;
  } catch {
    return false;
  }
}

export function loadData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return defaultData();
    try {
      return sanitizeData(JSON.parse(raw)).data;
    } catch {
      // Keep an unreadable copy instead of silently overwriting it.
      localStorage.setItem(`${DATA_KEY}.corrupt.${Date.now()}`, raw);
      return defaultData();
    }
  } catch {
    return defaultData();
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify({ version: 1, ...data }));
    return true;
  } catch {
    return false;
  }
}

export const DEFAULT_SETTINGS = { weekStart: 0, hour24: false, hiddenCategories: [] };

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return {
      weekStart: [0, 1, 6].includes(raw.weekStart) ? raw.weekStart : 0,
      hour24: raw.hour24 === true,
      hiddenCategories: Array.isArray(raw.hiddenCategories)
        ? raw.hiddenCategories.filter((x) => typeof x === "string")
        : [],
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Settings are a convenience; ignore storage errors here.
  }
}

// ------------------------------------------------------------------ reminders

export const firedKey = (o) => `${o.key}|${o.startTime}|${o.reminder}`;

export function loadFired() {
  try {
    const list = JSON.parse(localStorage.getItem(FIRED_KEY) || "[]");
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export function saveFired(set) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify([...set].slice(-300)));
  } catch {
    // ignore
  }
}

// Reminders that should be showing now and haven't been shown yet.
// All-day events remind at 9:00 AM on the day (minus the chosen offset).
export function dueReminders(events, now, fired) {
  const from = toKey(addDays(now, -1));
  const to = toKey(addDays(now, 2));
  return expandEvents(events, from, to).filter((o) => {
    if (o.reminder < 0 || fired.has(firedKey(o))) return false;
    const anchor = fromKey(o.startKey);
    if (o.allDay) anchor.setHours(9, 0, 0, 0);
    else anchor.setHours(Number(o.startTime.slice(0, 2)), Number(o.startTime.slice(3)), 0, 0);
    const fireAt = anchor.getTime() - o.reminder * 60000;
    const endAt = o.allDay ? addDays(fromKey(o.startKey), 1).getTime() : anchor.getTime();
    return fireAt <= now.getTime() && now.getTime() <= endAt;
  });
}

