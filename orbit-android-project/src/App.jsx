import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell, CalendarDays, ChevronLeft, ChevronRight, CircleHelp,
  List, PanelLeft, Search, Settings, Sparkles, WifiOff,
} from "lucide-react";
import {
  addDays, daysBetween, fromKey, monthGrid, rangeLabel, shiftMonth,
  shortDate, startOfDay, toKey, weekDays,
} from "./lib/dates.js";
import {
  OTHER_ID, blankEvent, buildBackup, defaultData, dueReminders, expandEvents, firedKey,
  loadData, loadFired, loadSettings, sanitizeData, saveData, saveFired, saveSettings,
  storageAvailable, timeLabel, uid,
} from "./lib/events.js";
import MonthView from "./components/MonthView.jsx";
import TimeGrid from "./components/TimeGrid.jsx";
import AgendaView from "./components/AgendaView.jsx";
import CalendarSidebar from "./components/CalendarSidebar.jsx";
import EventsPage from "./components/EventsPage.jsx";
import SettingsPage from "./components/SettingsPage.jsx";
import EventModal from "./components/EventModal.jsx";
import ConfirmModal from "./components/ConfirmModal.jsx";
import HelpModal from "./components/HelpModal.jsx";
import Toasts from "./components/Toasts.jsx";
import {
  isNative, nativePermission, requestNativePermission, setupNativeChannel, syncNativeReminders,
} from "./lib/nativeReminders.js";
import "./App.css";

const VIEWS = [
  ["month", "Month"],
  ["week", "Week"],
  ["day", "Day"],
  ["agenda", "Agenda"],
];
const PAGE_TITLES = { calendar: "Calendar", events: "Events", settings: "Settings" };
const AGENDA_DAYS = 90;

function App() {
  const [data, setData] = useState(loadData);
  const [settings, setSettings] = useState(loadSettings);
  const [storageOk] = useState(storageAvailable);
  const [page, setPage] = useState("calendar");
  const [view, setView] = useState("month");
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [showSide, setShowSide] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [notifPermission, setNotifPermission] = useState(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const searchRef = useRef(null);
  const firedRef = useRef(null);
  if (firedRef.current === null) firedRef.current = loadFired();

  const { weekStart, hour24 } = settings;
  const selectedKey = toKey(selected);
  const hidden = useMemo(() => new Set(settings.hiddenCategories), [settings.hiddenCategories]);
  const q = query.trim().toLowerCase();

  // ------------------------------------------------------------------ toasts
  const pushToast = useCallback((text, kind = "info") => {
    const id = uid();
    setToasts((list) => [...list, { id, text, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), kind === "reminder" ? 15000 : 5000);
  }, []);
  const dismissToast = (id) => setToasts((list) => list.filter((t) => t.id !== id));

  // ------------------------------------------------------------- persistence
  useEffect(() => {
    if (!saveData(data)) {
      // Deferred so the toast isn't a state update inside the effect itself.
      setTimeout(() => pushToast("Couldn't save your calendar. Browser storage may be full or blocked.", "error"), 0);
    }
  }, [data, pushToast]);

  useEffect(() => saveSettings(settings), [settings]);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // --------------------------------------------------------------- reminders
  useEffect(() => {
    // On Android the system delivers reminders (see syncNativeReminders), so don't duplicate them.
    if (isNative()) return undefined;
    function check() {
      const due = dueReminders(data.events, new Date(), firedRef.current);
      if (!due.length) return;
      due.forEach((o) => {
        firedRef.current.add(firedKey(o));
        const body = `${shortDate(o.startKey)} · ${timeLabel(o, hour24)}`;
        pushToast(`${o.title} — ${body}`, "reminder");
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification(o.title, { body });
          } catch {
            // Some mobile browsers only allow notifications from a service worker.
          }
        }
      });
      saveFired(firedRef.current);
    }
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [data.events, hour24, pushToast]);

  useEffect(() => {
    if (!isNative()) return;
    setupNativeChannel().catch(() => {});
    nativePermission().then(setNotifPermission).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isNative()) return;
    syncNativeReminders(data.events, hour24).catch((err) => console.warn("Reminder scheduling failed", err));
  }, [data.events, hour24]);

  // ------------------------------------------------------------ derived data
  const categoryById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const catColor = (id) => categoryById.get(id)?.color ?? "#8a8a8a";
  const categoryName = (id) => categoryById.get(id)?.name || "Other";

  const visibleEvents = useMemo(
    () =>
      data.events.filter(
        (e) =>
          !hidden.has(e.category) &&
          (!q || e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)),
      ),
    [data.events, hidden, q],
  );

  const viewRange = useMemo(() => {
    if (view === "month") {
      const g = monthGrid(selected, weekStart);
      return [toKey(g[0]), toKey(g[41])];
    }
    if (view === "week") {
      const w = weekDays(selected, weekStart);
      return [toKey(w[0]), toKey(w[6])];
    }
    if (view === "day") return [selectedKey, selectedKey];
    return [selectedKey, toKey(addDays(selected, AGENDA_DAYS))];
  }, [view, selected, selectedKey, weekStart]);

  const viewOccs = useMemo(
    () => expandEvents(visibleEvents, viewRange[0], viewRange[1]),
    [visibleEvents, viewRange],
  );

  const miniOccs = useMemo(() => {
    const g = monthGrid(selected, weekStart);
    return expandEvents(visibleEvents, toKey(g[0]), toKey(g[41]));
  }, [visibleEvents, selected, weekStart]);

  const listedEvents = useMemo(
    () =>
      data.events
        .filter((e) => !q || e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q))
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime)),
    [data.events, q],
  );

  // -------------------------------------------------------------- navigation
  function step(dir) {
    setSelected((d) => (view === "month" ? shiftMonth(d, dir) : addDays(d, dir * (view === "day" ? 1 : 7))));
  }
  function goToday() {
    setSelected(startOfDay(new Date()));
    setPage("calendar");
  }
  function selectDay(key) {
    setSelected(fromKey(key));
  }
  function showDay(key) {
    setSelected(fromKey(key));
    setView("day");
  }

  // ------------------------------------------------------------------ events
  function createEvent(key = selectedKey, opts = {}) {
    setEditing({
      event: blankEvent(key, opts.startTime ?? "09:00", opts.allDay ?? false),
      occurrence: key,
    });
  }
  function openOccurrence(occ) {
    const ev = data.events.find((e) => e.id === occ.id);
    if (ev) setEditing({ event: ev, occurrence: occ.startKey });
  }
  function openStored(ev) {
    setEditing({ event: ev, occurrence: ev.startDate });
  }

  function saveEvent(form, scope, occStart) {
    const base = editing.event;
    const newId = uid();
    setData((d) => {
      let events;
      if (!base.id) {
        events = [...d.events, { ...form, id: newId, exceptions: [] }];
      } else if (base.repeat === "none" || scope === "all") {
        events = d.events.map((e) => {
          if (e.id !== base.id) return e;
          if (e.repeat === "none") return { ...form, id: e.id, exceptions: [] };
          // Editing a series from one of its occurrences: shift the whole series by the same amount.
          const delta = daysBetween(occStart, form.startDate);
          const span = daysBetween(form.startDate, form.endDate);
          const start = toKey(addDays(fromKey(e.startDate), delta));
          return {
            ...form,
            id: e.id,
            startDate: start,
            endDate: toKey(addDays(fromKey(start), span)),
            exceptions: form.repeat === "none" ? [] : e.exceptions,
          };
        });
      } else {
        events = d.events.map((e) =>
          e.id === base.id ? { ...e, exceptions: [...e.exceptions, occStart] } : e,
        );
        events.push({ ...form, id: newId, exceptions: [] });
      }
      return { ...d, events };
    });
    setEditing(null);
    pushToast("Event saved");
  }

  function deleteEvent(scope, occStart) {
    const base = editing.event;
    setData((d) => ({
      ...d,
      events:
        base.repeat === "none" || scope === "all"
          ? d.events.filter((e) => e.id !== base.id)
          : d.events.map((e) => (e.id === base.id ? { ...e, exceptions: [...e.exceptions, occStart] } : e)),
    }));
    setEditing(null);
    pushToast("Event deleted");
  }

  // Drag an event to another day in month view (one-off events only).
  function moveEvent(id, fromDay, toDay) {
    const delta = daysBetween(fromDay, toDay);
    if (!delta) return;
    setData((d) => ({
      ...d,
      events: d.events.map((e) =>
        e.id === id && e.repeat === "none"
          ? {
              ...e,
              startDate: toKey(addDays(fromKey(e.startDate), delta)),
              endDate: toKey(addDays(fromKey(e.endDate), delta)),
            }
          : e,
      ),
    }));
  }

  // -------------------------------------------------------------- categories
  function addCategory(name, color) {
    setData((d) => ({ ...d, categories: [...d.categories, { id: uid(), name, color }] }));
  }
  function updateCategory(id, patch) {
    setData((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }
  function deleteCategory(id) {
    if (id === OTHER_ID) return;
    setData((d) => ({
      categories: d.categories.filter((c) => c.id !== id),
      events: d.events.map((e) => (e.category === id ? { ...e, category: OTHER_ID } : e)),
    }));
    setSettings((s) => ({ ...s, hiddenCategories: s.hiddenCategories.filter((x) => x !== id) }));
  }
  function toggleCategory(id) {
    setSettings((s) => ({
      ...s,
      hiddenCategories: s.hiddenCategories.includes(id)
        ? s.hiddenCategories.filter((x) => x !== id)
        : [...s.hiddenCategories, id],
    }));
  }

  // ----------------------------------------------------- export / import / reset
  function exportData() {
    const blob = new Blob([JSON.stringify(buildBackup(data), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orbit-backup-${toKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    pushToast("Backup downloaded");
  }

  async function importFile(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      pushToast("That file is too large to be an Orbit backup.", "error");
      return;
    }
    try {
      const { data: incoming, skipped } = sanitizeData(JSON.parse(await file.text()));
      setDialog({ type: "import", incoming, skipped });
    } catch (err) {
      pushToast(err instanceof SyntaxError ? "That file isn't valid JSON." : err.message, "error");
    }
  }

  function applyImport(mode) {
    const { incoming } = dialog;
    setData((d) => {
      if (mode === "replace") return incoming;
      const events = new Map(d.events.map((e) => [e.id, e]));
      incoming.events.forEach((e) => events.set(e.id, e));
      const categories = new Map(d.categories.map((c) => [c.id, c]));
      incoming.categories.forEach((c) => categories.set(c.id, c));
      return { events: [...events.values()], categories: [...categories.values()] };
    });
    setDialog(null);
    pushToast(`Imported ${incoming.events.length} event${incoming.events.length === 1 ? "" : "s"}`);
  }

  function resetData() {
    setData(defaultData());
    setSettings((s) => ({ ...s, hiddenCategories: [] }));
    firedRef.current = new Set();
    saveFired(firedRef.current);
    setDialog(null);
    pushToast("All calendar data was reset");
  }

  function enableNotifications() {
    if (isNative()) {
      requestNativePermission().then(setNotifPermission).catch(() => {});
      return;
    }
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setNotifPermission);
  }

  // --------------------------------------------------------------- shortcuts
  const keyHandler = useRef(null);
  useEffect(() => {
    keyHandler.current = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || editing || dialog) return;
      if (e.target instanceof Element && e.target.closest("input, textarea, select")) return;
      const onCalendar = page === "calendar";
      const key = e.key.toLowerCase();
      if (key === "n") { e.preventDefault(); createEvent(); }
      else if (key === "t") { goToday(); }
      else if (key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "?") { setDialog({ type: "help" }); }
      else if (onCalendar && key === "m") setView("month");
      else if (onCalendar && key === "w") setView("week");
      else if (onCalendar && key === "d") setView("day");
      else if (onCalendar && key === "a") setView("agenda");
      else if (onCalendar && e.key === "ArrowLeft") step(-1);
      else if (onCalendar && e.key === "ArrowRight") step(1);
    };
  });
  useEffect(() => {
    const handler = (e) => keyHandler.current?.(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ------------------------------------------------------------------ render
  const days = view === "week" ? weekDays(selected, weekStart) : [selected];
  const noEventsYet = data.events.length === 0;
  const commonView = {
    occs: viewOccs, catColor, hour24, selectedKey,
    onOpen: openOccurrence, onCreate: createEvent, onSelectDay: selectDay,
  };

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Sparkles size={17} /></div>
          <div>
            <h1>Orbit</h1>
            <p>Your calendar, your space.</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main">
          <p className="nav-heading">WORKSPACE</p>
          <button type="button" className={`nav-item${page === "calendar" ? " active" : ""}`} aria-current={page === "calendar" ? "page" : undefined} onClick={() => setPage("calendar")}>
            <CalendarDays size={14} /> Calendar
          </button>
          <button type="button" className={`nav-item${page === "events" ? " active" : ""}`} aria-current={page === "events" ? "page" : undefined} onClick={() => setPage("events")}>
            <List size={14} /> Events
          </button>
          <p className="nav-heading">PREFERENCES</p>
          <button type="button" className={`nav-item${page === "settings" ? " active" : ""}`} aria-current={page === "settings" ? "page" : undefined} onClick={() => setPage("settings")}>
            <Settings size={14} /> Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          {online ? <span className="status-dot" /> : <WifiOff size={11} />}
          {online ? "Everything stays on your device" : "Offline · saved on your device"}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={13} /><strong>{PAGE_TITLES[page]}</strong></div>
          <div className="topbar-actions">
            <button type="button" className="topbar-icon" aria-label="Reminder settings" title="Reminder settings" onClick={() => setPage("settings")}><Bell size={15} /></button>
            <button type="button" className="topbar-icon" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" onClick={() => setDialog({ type: "help" })}><CircleHelp size={15} /></button>
          </div>
        </header>

        {!storageOk && (
          <div className="banner-warning" role="alert">
            Your browser is blocking local storage, so events you add will be lost when you close this tab.
          </div>
        )}

        {page === "settings" ? (
          <section className="calendar-panel page">
            <div className="page-header"><h2>Settings</h2></div>
            <SettingsPage
              settings={settings}
              onSettings={(patch) => setSettings((s) => ({ ...s, ...patch }))}
              categories={data.categories}
              eventCount={data.events.length}
              onAddCategory={addCategory}
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
              notifPermission={notifPermission}
              onEnableNotifications={enableNotifications}
              onExport={exportData}
              onImportFile={importFile}
              onReset={() => setDialog({ type: "reset" })}
              storageOk={storageOk}
              native={isNative()}
              online={online}
            />
          </section>
        ) : (
          <section className="calendar-panel" id="calendar">
            <div className="calendar-toolbar">
              {page === "calendar" && (
                <button type="button" className="toolbar-icon" aria-label={showSide ? "Hide sidebar" : "Show sidebar"} aria-pressed={showSide} onClick={() => setShowSide((v) => !v)}>
                  <PanelLeft size={15} />
                </button>
              )}
              <form className="search-form" role="search" onSubmit={(e) => e.preventDefault()}>
                <Search className="search-icon" size={15} />
                <input
                  ref={searchRef}
                  className="search-field"
                  type="search"
                  placeholder="Search events…  ( / )"
                  aria-label="Search events"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </form>
              {q && (
                <span className="search-count" aria-live="polite">
                  {page === "calendar" ? viewOccs.length : listedEvents.length} match{(page === "calendar" ? viewOccs.length : listedEvents.length) === 1 ? "" : "es"}
                </span>
              )}
            </div>

            <div className="calendar-actions">
              <button type="button" className="primary-button" onClick={() => createEvent()}><Sparkles size={13} /> New event</button>
              {page === "calendar" && (
                <button type="button" className="today-button" onClick={goToday}><CalendarDays size={13} /> Today</button>
              )}
            </div>

            {page === "events" ? (
              <div className="calendar-content single">
                <EventsPage
                  events={listedEvents}
                  totalCount={data.events.length}
                  categoryName={categoryName}
                  catColor={catColor}
                  hour24={hour24}
                  searching={Boolean(q)}
                  onOpen={openStored}
                  onCreate={createEvent}
                />
              </div>
            ) : (
              <div className={`calendar-content${showSide ? "" : " no-side"}`}>
                {showSide && (
                  <CalendarSidebar
                    selected={selected}
                    weekStart={weekStart}
                    occs={miniOccs}
                    onSelectDay={selectDay}
                    onShiftMonth={(n) => setSelected((d) => shiftMonth(d, n))}
                    categories={data.categories}
                    hidden={hidden}
                    onToggleCategory={toggleCategory}
                    onShowAll={() => setSettings((s) => ({ ...s, hiddenCategories: [] }))}
                  />
                )}

                <div className="calendar-main">
                  <div className="calendar-main-heading">
                    <button type="button" className="arrow-button" aria-label={`Previous ${view === "agenda" ? "week" : view}`} onClick={() => step(-1)}><ChevronLeft size={16} /></button>
                    <h2 className="range-label" aria-live="polite">{rangeLabel(view, selected, weekStart)}</h2>
                    <button type="button" className="arrow-button" aria-label={`Next ${view === "agenda" ? "week" : view}`} onClick={() => step(1)}><ChevronRight size={16} /></button>
                    <div className="view-switch" role="group" aria-label="Calendar view">
                      {VIEWS.map(([id, label]) => (
                        <button type="button" key={id} aria-pressed={view === id} className={view === id ? "active" : ""} onClick={() => setView(id)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {noEventsYet && !q && view !== "agenda" && (
                    <div className="hint-banner">
                      Welcome to Orbit. Press <kbd>N</kbd> or <strong>New event</strong> to add your first event.
                      {view === "month" && " You can also double-click any day."}
                    </div>
                  )}
                  {!noEventsYet && q && viewOccs.length === 0 && view !== "agenda" && (
                    <div className="hint-banner">No events match “{query.trim()}” in this view.</div>
                  )}

                  {view === "month" && (
                    <MonthView
                      {...commonView}
                      date={selected}
                      weekStart={weekStart}
                      onShowDay={showDay}
                      onMove={moveEvent}
                    />
                  )}
                  {(view === "week" || view === "day") && <TimeGrid {...commonView} days={days} />}
                  {view === "agenda" && (
                    <AgendaView
                      fromDay={selectedKey}
                      occs={viewOccs}
                      categoryName={categoryName}
                      catColor={catColor}
                      hour24={hour24}
                      searching={Boolean(q)}
                      onOpen={openOccurrence}
                      onCreate={createEvent}
                    />
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </section>

      {editing && (
        <EventModal
          event={editing.event}
          occurrence={editing.occurrence}
          categories={data.categories}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onClose={() => setEditing(null)}
        />
      )}

      {dialog?.type === "help" && <HelpModal onClose={() => setDialog(null)} />}

      {dialog?.type === "reset" && (
        <ConfirmModal
          title="Reset all data?"
          message="This permanently deletes every event and custom category stored in this browser. Export a backup first if you might want them back."
          actions={[{ label: "Delete everything", danger: true, onClick: resetData }]}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === "import" && (
        <ConfirmModal
          title="Import backup"
          message={`This file has ${dialog.incoming.events.length} event${dialog.incoming.events.length === 1 ? "" : "s"}${
            dialog.skipped ? ` (${dialog.skipped} invalid ${dialog.skipped === 1 ? "entry was" : "entries were"} skipped)` : ""
          }. Replace your current calendar with it, or merge it into what you have? Merging keeps your events and overwrites any with the same ID.`}
          actions={[
            { label: "Merge", onClick: () => applyImport("merge") },
            { label: "Replace", danger: true, onClick: () => applyImport("replace") },
          ]}
          onClose={() => setDialog(null)}
        />
      )}

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}

export default App;
