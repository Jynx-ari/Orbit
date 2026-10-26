# Orbit

A personal calendar that keeps your data on your device by default. It runs in any browser and as an Android app. Optionally, you can share calendars with other people through a small self-hosted server.

Local-only use needs no account and no server. Sharing is opt-in per calendar.

---

## Features

**Calendar**
- Month, week, day, and agenda (next 90 days) views
- Previous / next, a Today button, and a mini calendar with dots on days that have events
- Today and the selected day are marked separately

**Events**
- Create, edit, move, and delete events
- All-day events and multi-day events
- Notes, a category, a reminder, and a repeat rule on every event
- Drag a one-off event to another day in month view
- Double-click a day (month view) or click an empty time slot (week/day view) to add an event there

**Repeating events**
- Daily, weekly, monthly, or yearly, with an optional end date
- Editing or deleting a repeating event asks: *only this day* or *all events*
- A monthly event on the 31st lands on the last day of shorter months

**Categories**
- Defaults: Personal, School, Projects, Other
- Add, rename, recolor, and delete categories; deleting moves its events to Other
- Show or hide categories from the calendar with the sidebar checkboxes

**Reminders**
- At time of event, 5 / 10 / 15 / 30 minutes, 1 hour, or 1 day before
- All-day event reminders fire at 9:00 AM
- Android: scheduled with the phone's notification system, so they fire even when Orbit is closed
- Browser: shown while Orbit is open, plus a browser notification if you allow it
- Reminders are always scheduled on your own device, including for shared events

**Sharing (optional)**
- Sign in with your email to sync calendars you share with others
- Shared calendars have three roles: owner, editor, viewer
- Invite people by email; they accept the invite inside Orbit
- Changes from others appear while Orbit is open
- Push notifications when Orbit is closed: Web Push in the browser, and push through Firebase on Android
- A calendar is either local-only or shared. Local-only calendars never leave the device

**Data**
- Everything is saved automatically in the browser's local storage
- Export a backup as a JSON file; import it back with *Merge* or *Replace*
- Reset all data (with confirmation)
- Search by title or notes

**Other**
- 12-hour or 24-hour time, and week starting on Sunday, Monday, or Saturday
- Works offline after the first visit (browser build); offline edits to shared calendars sync when you reconnect
- Phone layout with a bottom tab bar; dialogs become bottom sheets
- Keyboard shortcuts (see below)

---

## Tech stack

| Part | Choice |
| --- | --- |
| UI | React 19 |
| Build tool | Vite |
| Icons | lucide-react |
| Android wrapper | Capacitor 8 (`@capacitor/android`, `@capacitor/local-notifications`, `@capacitor/push-notifications`, `@capacitor/preferences`) |
| Offline (browser) | Hand-written service worker (`public/sw.js`) and web manifest |
| Local storage | Browser `localStorage` |
| Server (optional) | Node 22, Fastify, SQLite (`better-sqlite3`), `web-push` |
| Email (optional) | Resend (or any SMTP service) for sign-in links and invites |
| Hosting | Raspberry Pi 4 (4 GB), Raspberry Pi OS 64-bit, Cloudflare Tunnel |
| Linting | oxlint |

App ID: `com.jynx.orbit`. Android minimum is 7.0 (API 24).

---

## Project structure

```
Orbit/
├─ index.html
├─ capacitor.config.json        Android app settings
├─ public/
│  ├─ manifest.webmanifest      Install info for the browser build
│  ├─ sw.js                     Offline cache and Web Push handler
│  └─ favicon.svg
├─ src/
│  ├─ main.jsx                  Entry point, registers the service worker
│  ├─ App.jsx                   State, saving, shortcuts, import/export, layout
│  ├─ App.css                   All styles, including the phone layout
│  ├─ lib/
│  │  ├─ dates.js               Date helpers (dates stored as "YYYY-MM-DD")
│  │  ├─ events.js              Repeats, validation, storage, reminders
│  │  ├─ nativeReminders.js     Schedules Android notifications
│  │  ├─ sync.js                Pulls and pushes shared calendars, queues offline edits
│  │  ├─ auth.js                Sign-in state; cookie on web, token on Android
│  │  └─ useTodayKey.js         Keeps "today" correct overnight
│  └─ components/
│     ├─ MonthView.jsx · TimeGrid.jsx (week + day) · AgendaView.jsx
│     ├─ CalendarSidebar.jsx    Mini calendar, category filters, shared calendars
│     ├─ EventModal.jsx         Create / edit form
│     ├─ EventsPage.jsx · SettingsPage.jsx · AccountPage.jsx · SharePage.jsx
│     └─ Modal.jsx · ConfirmModal.jsx · HelpModal.jsx · Toasts.jsx · EventChip.jsx
├─ server/
│  ├─ src/
│  │  ├─ index.js               Fastify app, serves dist/ and /api
│  │  ├─ auth.js                Magic links, sessions, bearer tokens
│  │  ├─ calendars.js           Calendars, members, invites
│  │  ├─ events.js              Event sync with versions and tombstones
│  │  ├─ push.js                Web Push and Firebase delivery
│  │  └─ db.js                  SQLite schema and migrations
│  ├─ .env.example
│  └─ package.json
└─ android/                     Android Studio project (generated by Capacitor)
```

Dates are kept as plain local-date text such as `2026-10-25`, never as timestamps, so events don't shift with time zones or daylight saving.

---

## Architecture

```
 Browser / Android app                 Raspberry Pi 4
 ┌──────────────────────┐   HTTPS   ┌──────────────────────────┐
 │ Orbit UI             │ ───────▶  │ cloudflared (tunnel)     │
 │ localStorage (cache) │ ◀───────  │   ↓                      │
 │ sync queue           │   SSE     │ Fastify  /api  + dist/   │
 └──────────────────────┘           │   ↓                      │
                                    │ SQLite (orbit.db)        │
                                    └──────────────────────────┘
```

- The device always has a full copy of the calendars it can see, so the app works offline.
- The server is the meeting point for shared calendars. It stores the latest version of each shared event and tells members when something changes.
- Cloudflare terminates HTTPS and forwards traffic to the Pi. The Pi opens no inbound ports.

---

## Accounts and sign-in

**Web (browser build)**
1. Enter your email on the sign-in page.
2. The server emails a sign-in link that expires in 15 minutes and works once.
3. Clicking it creates a session and sets an `orbit_session` cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, valid for 30 days.
4. Each browser signs in separately. The cookie identifies that browser's session, which maps to your account.

**Android**
The Android app runs in its own WebView, which keeps cookies separate from Chrome and doesn't reliably send them to another domain. So the app signs in the same way, but the server returns a bearer token instead of a cookie. The token is stored with `@capacitor/preferences` and sent in the `Authorization` header.

**Without email**
If you don't want to send email, the owner of a shared calendar can create an invite link instead. The link can be opened once, and the person picks a display name. The invite link is a secret, so send it only to the person it's for.

**Sessions** can be listed and revoked from the account page.

---

## Sharing a calendar

1. The owner creates a shared calendar and chooses **Share**.
2. The owner enters an email address and a role (editor or viewer), or creates an invite link.
3. The server stores a pending invite and emails the link (or shows it to the owner).
4. The invitee signs in and accepts. Accepting is what adds them as a member.
5. Owners can change roles or remove members at any time. Removing a member revokes their access to the calendar on the next request.

Viewers can read events. Editors can create, change, and delete events. Only owners can invite people, change roles, or delete the calendar.

---

## Sync

Each shared event has a `version` number that increases on every change, and an `updatedAt` timestamp. Deleted events stay in the database as tombstones (`deleted: true`) so that offline devices learn about the deletion when they reconnect.

**Pull:** the app asks for changes since its last cursor, `GET /api/calendars/:id/events?since=<cursor>`. The response includes changed events and tombstones.

**Push:** each edit includes the `version` the device last saw, `PUT /api/calendars/:id/events/:eventId`. If the server's version is newer, it returns `409 Conflict` with both versions. The app shows the two versions, and the user picks one. Edits are never silently overwritten.

**Offline:** edits to shared calendars are stored in a local queue and sent in order when the connection returns. Local-only calendars are unaffected.

**Live updates:** while Orbit is open, it holds a Server-Sent Events connection to `GET /api/stream`. The server sends a short "calendar changed" message to that user's connection only, and the app pulls the changes.

**Closed-app notifications:** the server sends a notification to a user's subscription only when that user is a member of the calendar that changed. Nothing is broadcast to everyone.

---

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/magic-link` | Email a sign-in link |
| GET | `/api/auth/verify?token=…` | Consume a link, set cookie (web) or return token (Android) |
| POST | `/api/auth/logout` | End the current session |
| GET | `/api/me` | Current user |
| GET | `/api/sessions` · DELETE `/api/sessions/:id` | List or revoke sessions |
| GET | `/api/calendars` | Calendars I'm a member of |
| POST | `/api/calendars` | Create a shared calendar |
| POST | `/api/calendars/:id/invites` | Invite by email or create an invite link |
| POST | `/api/invites/:token/accept` | Accept an invite |
| PATCH | `/api/calendars/:id/members/:userId` | Change a role |
| DELETE | `/api/calendars/:id/members/:userId` | Remove a member |
| GET | `/api/calendars/:id/events?since=` | Pull changes |
| PUT | `/api/calendars/:id/events/:eventId` | Create or update (send `version`) |
| DELETE | `/api/calendars/:id/events/:eventId` | Soft delete (tombstone) |
| POST | `/api/push/subscriptions` | Save a Web Push subscription |
| POST | `/api/push/devices` | Save a Firebase device token (Android) |
| GET | `/api/stream` | Server-Sent Events for live updates |

Every route except the auth ones requires a valid session cookie or bearer token. Every write checks the caller's role for that calendar.

---

## Run it in the browser

```bash
npm install
npm run dev        # development server (local-only mode)
npm run build      # production build into dist/
npm run preview    # serve the production build (the service worker only runs here)
npm run lint
```

## Run the server locally

```bash
cd server
cp .env.example .env     # set ORBIT_BASE_URL, DB path, mail and push keys
npm install
npm run dev              # listens on http://localhost:8080 and serves ../dist
```

Build the web app first (`npm run build` in the project root) so the server has something to serve.

**Server environment (`server/.env`)**

| Variable | Meaning |
| --- | --- |
| `ORBIT_BASE_URL` | Public address, e.g. `https://orbit.example.com` |
| `ORBIT_DB_PATH` | SQLite file, e.g. `/var/lib/orbit/orbit.db` |
| `MAIL_FROM` · `RESEND_API_KEY` | Sender and key for sign-in and invite email (optional) |
| `VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` · `VAPID_SUBJECT` | Web Push keys (generate once with `npx web-push generate-vapid-keys`) |
| `FIREBASE_SERVICE_ACCOUNT` | Path to the Firebase key file for Android push (optional) |
| `PORT` | Default `8080` |

---

## Deploy on the Raspberry Pi

**Requirements:** a free Cloudflare account, your domain's DNS managed by Cloudflare, Raspberry Pi OS 64-bit, Node 22.

**1. Set up the server**

```bash
git clone https://github.com/Jynx-ari/Orbit.git ~/orbit
cd ~/orbit && npm install && npm run build
cd server && npm install
sudo mkdir -p /var/lib/orbit && sudo chown $USER /var/lib/orbit
```

Create a systemd service so the server starts on boot, pointing at `server/src/index.js` with the `.env` file.

**2. Install cloudflared (arm64)**

Download the `cloudflared-linux-arm64` build from Cloudflare's GitHub releases and put it in `/usr/local/bin/cloudflared`.

**3. Create the tunnel**

```bash
cloudflared tunnel login
cloudflared tunnel create orbit
cloudflared tunnel route dns orbit orbit.example.com
```

Replace `orbit.example.com` with your domain (or subdomain).

**4. Configure the tunnel** in `/etc/cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: /home/<user>/.cloudflared/<TUNNEL-UUID>.json

ingress:
  - hostname: orbit.example.com
    service: http://localhost:8080
  - service: http_status:404
```

**5. Run it as a service**

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Visit `https://orbit.example.com`. Because the tunnel makes outbound connections only, you don't need to open any ports on your router.

**Updating the web version:** run `npm run build`, then restart the server service. Bump the service worker's cache name in `public/sw.js` so browsers pick up the new files.

**Android:** set the server address in `capacitor.config.json` (`server.url` is not used; the app calls the API at the address in `VITE_ORBIT_API`). Then run `npm run build` and `npx cap sync android`.

**Backups:** a nightly job runs `sqlite3 /var/lib/orbit/orbit.db ".backup /mnt/usb/orbit-$(date +%F).db"` to a USB drive or other disk. Keep at least a week of copies. SD cards fail, so don't keep the only copy on the card.

---

## Security

- HTTPS only, through the Cloudflare Tunnel. The server rejects non-HTTPS cookies.
- Sign-in links expire after 15 minutes and work once.
- Rate limits on sign-in, invite, and sync endpoints.
- Every input is validated on the server. Clients are never trusted for roles.
- Session cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`.
- SSH on the Pi uses keys only, with password login turned off.
- Keep your Cloudflare account secured with two-factor sign-in.
- Invite links are secrets. Revoke any you no longer need from the Share page.

---

## Build the Android app

These steps are for Arch Linux with VS Code, but only the install step is Arch-specific.

**1. Install the tools (once)**

```bash
sudo pacman -S --needed nodejs npm jdk21-openjdk android-tools
yay -S android-studio android-udev
```

Open Android Studio once and let the setup wizard install the Android SDK (Standard setup). If SDK Tools looks empty, tick *Show Package Details* in **Tools → SDK Manager → SDK Tools** and install **Build-Tools** and **Platform-Tools**.

**2. Build and sync after any code change**

```bash
npm install
npm run build
npx cap sync android
```

**3. Run on your phone**

```bash
npx cap open android
```

In Android Studio, choose your phone in the device menu and press the green Run button. For a shareable file, use **Build → Build APK(s)**; the debug APK ends up in `android/app/build/outputs/apk/debug/`.

**4. Phone setup**
- Turn on Developer options (tap *Build number* seven times) and then **USB debugging**
- Set USB mode to **File transfer** and accept the "Allow USB debugging?" prompt
- Allow notifications for Orbit
- On Huawei phones, set Orbit's battery use to **Unrestricted** and allow auto-launch and background activity, or reminders may be delayed or blocked
- For shared calendars, add the Firebase `google-services.json` to `android/app/` before building

**Troubleshooting**

| Problem | Fix |
| --- | --- |
| `adb devices` is empty | Turn on USB debugging; use a data cable; replug; accept the prompt |
| Phone shows `unauthorized` | Revoke USB debugging authorizations on the phone, replug, accept again |
| Gradle can't find the SDK | Set the location in Android Studio's SDK Manager (usually `~/Android/Sdk`) |
| Android Studio window is garbled on KDE | Start it with `_JAVA_AWT_WM_NONREPARENTING=1 android-studio` |
| New code doesn't show on the phone | Run `npm run build` and `npx cap sync android`, then Run again |
| Sign-in works in Chrome but not in the app | The app uses a bearer token; check that `VITE_ORBIT_API` points at the HTTPS domain |

---

## Your data

| Key in `localStorage` | Holds |
| --- | --- |
| `orbit.data.v1` | Local-only events and categories |
| `orbit.shared.v1` | Cached copy of shared calendars and the offline edit queue |
| `orbit.settings.v1` | Week start, time format, hidden categories |
| `orbit.fired.v1` | Reminders already shown (browser build) |
| `orbit.session.v1` | Sign-in state (Android only; web uses the cookie) |

On the server, the SQLite database holds accounts, sessions (hashed tokens), calendars, members, invites, events with tombstones, and push subscriptions. Passwords are never stored because sign-in uses email links.

Backup file format (`orbit-backup-YYYY-MM-DD.json`) for local-only calendars:

```json
{
  "app": "orbit",
  "version": 1,
  "exportedAt": "2026-10-25T12:00:00.000Z",
  "events": [
    {
      "id": "…",
      "title": "Dentist",
      "startDate": "2026-10-27",
      "endDate": "2026-10-27",
      "allDay": false,
      "startTime": "15:00",
      "endTime": "16:00",
      "category": "personal",
      "description": "",
      "repeat": "none",
      "repeatUntil": "",
      "reminder": 15,
      "exceptions": []
    }
  ],
  "categories": [{ "id": "personal", "name": "Personal", "color": "#36cda1" }]
}
```

`reminder` is minutes before the event (`-1` means none). `exceptions` lists dates removed from a repeating series.

Local-only data lives only on the device and browser you use. Clearing app or site data erases it, so export a backup now and then. Shared calendars are also stored on the server, so they survive a lost device. Export still works for any calendar.

---

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `N` | New event |
| `T` | Jump to today |
| `←` / `→` | Previous / next period |
| `M` `W` `D` `A` | Month, week, day, agenda |
| `/` | Search |
| `?` | Show help |
| `Esc` | Close a dialog |

---

## Test checklist

- [ ] Create, edit, and delete an event on the phone
- [ ] Create a reminder a few minutes ahead, close Orbit, and confirm the notification appears
- [ ] Create a repeating event and edit *only this day*
- [ ] Export a backup, reset, then import it
- [ ] Rotate the phone and check each view
- [ ] Browser build: `npm run build && npm run preview`, then check install and offline use
- [ ] Sign in on two browsers; confirm each has its own session
- [ ] Invite a second account as viewer; confirm it can't edit
- [ ] Edit the same shared event on two devices; confirm the 409 conflict prompt appears
- [ ] Go offline, edit a shared event, reconnect; confirm it syncs
- [ ] Revoke a session from the account page; confirm that browser is signed out
- [ ] Visit the tunnel domain from mobile data (outside your Wi-Fi)
- [ ] Restore the nightly SQLite backup to a scratch file and open it

---

## Known limitations

- The week view shows about three days at once on a phone; swipe sideways for the rest
- Only one-off events can be dragged (repeating events are edited through the form); dragging works in month view only
- Reminders on Android may be delayed by battery saver; the app schedules the nearest 200 reminders within 60 days
- Sharing needs the server running; local-only calendars keep working without it
- Conflicts are resolved by the user, not merged automatically
- A single Raspberry Pi is a single point of failure. The Pi being offline means shared calendars can't sync, though each device still works from its copy
- iOS is not set up yet

---

## Ideas for later

1. Undo for delete and move
2. A "last backup" reminder
3. `.ics` import and export, to bring in an existing calendar
4. Drag and resize in week and day view
5. A phone-first 3-day view
6. Light theme and compact/comfortable spacing
7. Quick add, e.g. "Dentist tomorrow 3pm"
8. Custom app icon and splash screen
9. iOS build
10. Passkeys as a sign-in option alongside email links

---

## Notes for committing

- Do not commit `android/local.properties` (it holds your SDK path); add it to `.gitignore`
- Do not commit `server/.env`, `google-services.json`, the Cloudflare credentials file, or any `*.db` file
- `android/app/src/main/assets/public/` is regenerated by `npx cap sync android`
- Run `npm run lint` before committing
