import { useRef, useState } from "react";
import { Download, Plus, Trash2, Upload } from "lucide-react";
import { OTHER_ID } from "../lib/events.js";

export default function SettingsPage({
  settings, onSettings, categories, eventCount,
  onAddCategory, onUpdateCategory, onDeleteCategory,
  notifPermission, onEnableNotifications,
  onExport, onImportFile, onReset, storageOk, online,
}) {
  const fileRef = useRef(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2ea9df");

  function addCategory(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAddCategory(name.trim(), color);
    setName("");
  }

  const notifText = {
    granted: "Browser notifications are on.",
    denied: "Notifications are blocked. Allow them in your browser's site settings to turn them on.",
    default: "Get a notification when a reminder is due while Orbit is open.",
    unsupported: "This browser doesn't support notifications. Reminders still appear inside Orbit.",
  }[notifPermission];

  return (
    <div className="page-body settings">
      <section className="settings-section">
        <h3>Calendar</h3>
        <label className="field inline">
          <span>Week starts on</span>
          <select value={settings.weekStart} onChange={(e) => onSettings({ weekStart: Number(e.target.value) })}>
            <option value={0}>Sunday</option>
            <option value={1}>Monday</option>
            <option value={6}>Saturday</option>
          </select>
        </label>
        <label className="field inline">
          <span>Time format</span>
          <select value={settings.hour24 ? "24" : "12"} onChange={(e) => onSettings({ hour24: e.target.value === "24" })}>
            <option value="12">12-hour (3:30 PM)</option>
            <option value="24">24-hour (15:30)</option>
          </select>
        </label>
      </section>

      <section className="settings-section">
        <h3>Categories</h3>
        <ul className="category-list">
          {categories.map((c) => (
            <li key={c.id}>
              <input type="color" value={c.color} aria-label={`${c.name} color`} onChange={(e) => onUpdateCategory(c.id, { color: e.target.value })} />
              <input
                className="text-input"
                value={c.name}
                maxLength={40}
                aria-label="Category name"
                onChange={(e) => onUpdateCategory(c.id, { name: e.target.value })}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={`Delete ${c.name}`}
                disabled={c.id === OTHER_ID}
                title={c.id === OTHER_ID ? "The Other category can't be deleted" : "Delete category"}
                onClick={() => onDeleteCategory(c.id)}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
        <form className="category-add" onSubmit={addCategory}>
          <input type="color" value={color} aria-label="New category color" onChange={(e) => setColor(e.target.value)} />
          <input className="text-input" value={name} maxLength={40} placeholder="New category name" aria-label="New category name" onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="secondary-button"><Plus size={13} /> Add</button>
        </form>
        <p className="hint">Deleting a category moves its events to “Other”.</p>
      </section>

      <section className="settings-section">
        <h3>Reminders</h3>
        <p className="hint">{notifText}</p>
        {notifPermission === "default" && (
          <button type="button" className="secondary-button" onClick={onEnableNotifications}>Enable notifications</button>
        )}
        <p className="hint">Reminders are checked while Orbit is open in a tab or installed as an app. Your browser can't wake a closed app to show them.</p>
      </section>

      <section className="settings-section">
        <h3>Your data</h3>
        <p className="hint">
          {storageOk
            ? `Your ${eventCount} event${eventCount === 1 ? " is" : "s are"} stored only in this browser on this device. ${online ? "" : "You're offline, and everything still works."}`
            : "Your browser is blocking storage, so changes will be lost when you close this tab."}
        </p>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onExport}><Download size={13} /> Export backup</button>
          <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}><Upload size={13} /> Import backup</button>
          <button type="button" className="danger-button" onClick={onReset}><Trash2 size={13} /> Reset all data</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => { onImportFile(e.target.files?.[0]); e.target.value = ""; }}
        />
      </section>
    </div>
  );
}
