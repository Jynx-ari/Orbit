import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { addDays, shortDate, toKey } from "./dates.js";
import { expandEvents, notificationId, reminderTime, timeLabel } from "./events.js";

export const REMINDER_CHANNEL = "reminders";
// Android allows a limited number of scheduled alarms per app; keep the nearest ones.
const MAX_SCHEDULED = 200;
const LOOKAHEAD_DAYS = 60;

export const isNative = () => Capacitor.isNativePlatform();

// Returns "granted" | "denied" | "default" for the current native permission.
export async function nativePermission() {
  const { display } = await LocalNotifications.checkPermissions();
  return display === "granted" ? "granted" : display === "denied" ? "denied" : "default";
}

export async function requestNativePermission() {
  const { display } = await LocalNotifications.requestPermissions();
  return display === "granted" ? "granted" : "denied";
}

export async function setupNativeChannel() {
  if (!isNative()) return;
  await LocalNotifications.createChannel({
    id: REMINDER_CHANNEL,
    name: "Event reminders",
    description: "Shows a reminder before an event starts",
    importance: 4,
    visibility: 1,
    vibration: true,
  });
}

// Replace everything Orbit has scheduled with the current upcoming reminders.
export async function syncNativeReminders(events, hour24) {
  if (!isNative()) return;
  const now = new Date();
  const occs = expandEvents(events, toKey(now), toKey(addDays(now, LOOKAHEAD_DAYS)));
  const upcoming = occs
    .filter((o) => o.reminder >= 0)
    .map((o) => ({ o, at: reminderTime(o) }))
    .filter(({ at }) => at > now.getTime())
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_SCHEDULED);

  const { notifications: pending } = await LocalNotifications.getPending();
  if (pending.length) {
    await LocalNotifications.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
  }
  if (!upcoming.length) return;

  await LocalNotifications.schedule({
    notifications: upcoming.map(({ o, at }) => ({
      id: notificationId(o),
      title: o.title,
      body: `${shortDate(o.startKey)} · ${timeLabel(o, hour24)}`,
      channelId: REMINDER_CHANNEL,
      smallIcon: "ic_stat_orbit",
      schedule: { at: new Date(at), allowWhileIdle: true },
    })),
  });
}
