# Orbit

A personal calendar that keeps your data on your device by default. It runs in any browser and as an Android app. Optionally, you can share a calendar with other people through a group, using a small self-hosted server.

Local-only use needs no account and no server. An account is only needed to create or join a group. The full account and group design is in [`ORBIT-accounts.md`](ORBIT-accounts.md).

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
- Reminders are always scheduled on your own device, including for group events

**Groups and accounts (optional)**
- Create an account with a username, a password, and an authenticator app. No email is used anywhere
- Create a group to share a calendar; Orbit gives it a join code like `ORB-7KQ2` and a QR code
- Others join by entering or scanning the code (signing up first if they have no account)
- Three roles: owner, editor, viewer. People who join with a code start as editors
- Sign in on other devices with username and password only. The authenticator is used for setup and password recovery, not for every sign-in
- Changes from others appear while Orbit is open
- Push notifications when Orbit is closed: Web Push in the browser, and push through Firebase on Android
- Personal events never go to a group. Local-only events never leave the device

**Data**
- Everything is saved automatically in the browser's local storage
- Export a backup as a JSON file; import it back with *Merge* or *Replace*
- Reset all data (with confirmation)
- Search by title or notes

**Other**
- 12-hour or 24-hour time, and week starting on Sunday, Monday, or Saturday
- Works offline after the first visit (browser build); offline edits to group events sync when you reconnect
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
| Passwords and 2FA | argon2id password hashing, standard TOTP (works with any authenticator app) |
| Hosting | Raspberry Pi 4 (4 GB), Raspberry Pi OS 64-bit, Cloudflare Tunnel |
| Linting | oxlint |

No email service is used. App ID: `com.jynx.orbit`. Android minimum is 7.0 (API 24).

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
│  │  ├─ sync.js                Pulls and pushes group events, queues offline edits
│  │  ├─ auth.js                Sign-in state; cookie on web, token on Android
│  │  └─ useTodayKey.js         Keeps "today" correct overnight
│  └─ components/
│     ├─ MonthView.jsx · TimeGrid.jsx (week + day) · AgendaView.jsx
│     ├─ CalendarSidebar.jsx    Mini calendar, category filters, groups
│     ├─ EventModal.jsx         Create / edit form
│     ├─ EventsPage.jsx · SettingsPage.jsx
│     ├─ AccountPage.jsx        Password, sessions, recovery codes
│     ├─ AuthPage.jsx           Sign up, sign in, forgot password, authenticator setup
│     ├─ GroupsPage.jsx         Create, join, manage members, join code options
│     └─ Modal.jsx · ConfirmModal.jsx · HelpModal.jsx · Toasts.jsx · EventChip.jsx
├─ server/
│  ├─ src/
│  │  ├─ index.js               Fastify app, serves dist/ and /api
│  │  ├─ auth.js                Sign-up, login, TOTP, recovery codes, sessions, bearer tokens
│  │  ├─ groups.js              Groups, members, roles, join codes
│  │  ├─ events.js              Event sync with versions and tombstones
│  │  ├─ push.js                Web Push and Firebase delivery
│  │  └─ db.js                  SQLite schema and migrations
│  ├─ scripts/
│  │  ├─ reset-2fa.js           Remove a user's authenticator setup
│  │  ├─ unlock.js              Clear a sign-in pause
│  │  └─ list-users.js          List usernames and 2FA status
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
- The server is the meeting point for groups. It stores the latest version of each group event and tells members when something changes.
- Cloudflare terminates HTTPS and forwards traffic to the Pi. The Pi opens no inbound ports.

---

## Accounts, groups, and sign-in

The full flows, rules, and admin commands are in [`ORBIT-accounts.md`](ORBIT-accounts.md). In short:

**Sign up:** username (3 to 20 letters, numbers, or underscores), a password of at least 10 characters, then scan a QR code with an authenticator app and enter one 6-digit code to confirm it. Orbit then shows 10 one-time recovery codes. Signing up does not join any group.

**Sign in:** username and password, on any device. No code is asked for.

**Forgot password:** username plus a current authenticator code (or a recovery code), then a new password. All sessions are signed out.

**Lost phone and recovery codes:** the owner of the server runs `node server/scripts/reset-2fa.js <username>` on the Pi. The password stays the same, and the person sets up a new authenticator at next sign-in.

**Web sessions:** a successful sign-in sets an `orbit_session` cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, valid for 30 days. Each browser signs in separately.

**Android:** the app runs in its own WebView, which keeps cookies separate from Chrome and doesn't reliably send them to another domain. So the server returns a bearer token instead of a cookie. The token is stored with `@capacitor/preferences`, sent in the `Authorization` header, and stays valid until the user signs out or it is revoked.

**Sessions** can be listed and revoked from the account page. *Sign out other devices* ends every session except the current one.

---

## Groups

1. Signed in, the owner opens **Groups → New group**, names it, and gets a join code like `ORB-7KQ2` and a QR code.
2. Others enter or scan the code in **Groups → Join**. If they aren't signed in, Orbit asks them to sign up first, then adds them.
3. Codes expire after 1, 7, or 30 days (default 30), and have a member limit of up to 50. The owner can rotate a code, which cancels the old one. People already in the group stay in.
4. Members join as editors. The owner can change a person to viewer, or remove them.

| Role | Can do |
| --- | --- |
| Owner | Everything: rename the group, manage codes, change roles, remove members, delete the group |
| Editor | Add, change, and delete group events |
| Viewer | See group events only |

Anyone who has the code can join until it expires or hits its limit, so share it in a private chat, not on a public page. Removing a member revokes their access to the group on the next request.

---

## Sync

Each group event has a `version` number that increases on every change, and an `updatedAt` timestamp. Deleted events stay in the database as tombstones (`deleted: true`) so that offline devices learn about the deletion when they reconnect.

**Pull:** the app asks for changes since its last cursor, `GET /api/groups/:id/events?since=<cursor>`. The response includes changed events and tombstones.

**Push:** each edit includes the `version` the device last saw, `PUT /api/groups/:id/events/:eventId`. If the server's version is newer, it returns `409 Conflict` with both versions. The app shows the two versions, and the user picks one. Edits are never silently overwritten.

**Offline:** edits to group events are stored in a local queue and sent in order when the connection returns. Local-only events are unaffected.

**Live updates:** while Orbit is open, it holds a Server-Sent Events connection to `GET /api/stream`. The server sends a short "group changed" message to that user's connection only, and the app pulls the changes.

**Closed-app notifications:** the server sends a notification to a user's subscription only when that user is a member of the group that changed. Nothing is broadcast to everyone.

---

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | `{ username, password }`: create an account, returns the 2FA setup |
| POST | `/api/auth/2fa/confirm` | `{ code }`: finish setup and return 10 recovery codes |
| POST | `/api/auth/login` | `{ username, password }`: returns a session (web) or token (Android) |
| POST | `/api/auth/reset/2fa` | `{ username, code, newPassword }`: forgot-password reset |
| POST | `/api/auth/password` | `{ currentPassword, newPassword }` while signed in |
| POST | `/api/auth/recovery-codes` | Generate 10 new recovery codes (old ones stop working) |
| POST | `/api/auth/logout` | End the current session |
| GET | `/api/me` | Current user |
| GET | `/api/sessions` | List sessions for the account |
| DELETE | `/api/sessions/:id` | Sign out one device |
| POST | `/api/sessions/others` | Sign out all other devices |
| GET | `/api/groups` | Groups the account belongs to |
| POST | `/api/groups` | `{ name }`: create a group and get its join code |
| PATCH | `/api/groups/:id` | Rename, change code settings, or rotate the code |
| POST | `/api/groups/join` | `{ code }`: join a group (account required) |
| PATCH | `/api/groups/:id/members/:userId` | Change a member's role (owner only) |
| DELETE | `/api/groups/:id/members/:userId` | Remove a member (owner only) |
| GET | `/api/groups/:id/events?since=` | Pull changes |
| PUT | `/api/groups/:id/events/:eventId` | Create or update (send `version`; editors and owner) |
| DELETE | `/api/groups/:id/events/:eventId` | Soft delete (tombstone) |
| POST | `/api/push/subscriptions` | Save a Web Push subscription |
| POST | `/api/push/devices` | Save a Firebase device token (Android) |
| GET | `/api/stream` | Server-Sent Events for live updates |

Every route except sign-up, login, and reset requires a valid session cookie or bearer token. Every write checks the caller's role for that group.

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
cp .env.example .env     # set ORBIT_BASE_URL, DB path, 2FA key, and push keys
npm install
npm run dev              # listens on http://localhost:8080 and serves ../dist
```

Build the web app first (`npm run build` in the project root) so the server has something to serve.

**Server environment (`server/.env`)**

| Variable | Meaning |
| --- | --- |
| `ORBIT_BASE_URL` | Public address, e.g. `https://orbit.example.com` |
| `ORBIT_DB_PATH` | SQLite file, e.g. `/var/lib/orbit/orbit.db` |
| `ORBIT_2FA_KEY` | Random secret that encrypts authenticator secrets. Generate once; losing it makes existing 2FA secrets unreadable |
| `VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` · `VAPID_SUBJECT` | Web Push keys (generate once with `npx web-push generate-vapid-keys`) |
| `FIREBASE_SERVICE_ACCOUNT` | Path to the Firebase key file for Android push (optional) |
| `PORT` | Default `8080` |

**Admin commands (run on the Pi)**

| Command | What it does |
| --- | --- |
| `node server/scripts/reset-2fa.js <username>` | Removes the authenticator setup; the person sets up a new one at next sign-in |
| `node server/scripts/unlock.js <username>` | Clears a sign-in pause after failed attempts |
| `node server/scripts/list-users.js` | Lists usernames, join dates, and whether 2FA is set up |

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

**Backups:** a nightly job runs `sqlite3 /var/lib/orbit/orbit.db ".backup /mnt/usb/orbit-$(date +%F).db"` to a USB drive or other disk. Keep at least a week of copies, and back up `server/.env` with them: without `ORBIT_2FA_KEY`, authenticator secrets can't be read. SD cards fail, so don't keep the only copy on the card.

---

## Security

- HTTPS only, through the Cloudflare Tunnel. The server rejects non-HTTPS cookies.
- Passwords are hashed with argon2id; the server never keeps the plain password. Minimum 10 characters.
- Recovery codes are stored as hashes. Authenticator secrets are encrypted with `ORBIT_2FA_KEY`.
- Sign-in attempts are rate-limited per username and per IP address, with a delay that grows up to one minute. After 10 failed attempts on one account within an hour, that account pauses for 15 minutes.
- Join codes are rate-limited per IP to stop guessing. Error messages never say whether a username exists.
- Every input is validated on the server. Clients are never trusted for roles.
- Session cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`.
- SSH on the Pi uses keys only, with password login turned off.
- Keep your Cloudflare account secured with two-factor sign-in.
- Join codes are secrets within a group. Rotate one if it leaks.

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
- For group push notifications, add the Firebase `google-services.json` to `android/app/` before building

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
| `orbit.shared.v1` | Cached copy of group calendars and the offline edit queue |
| `orbit.settings.v1` | Week start, time format, hidden categories |
| `orbit.fired.v1` | Reminders already shown (browser build) |
| `orbit.session.v1` | Sign-in state (Android only; web uses the cookie) |

On the server, the SQLite database holds accounts (password hashes, encrypted authenticator secrets, recovery code hashes), sessions (hashed tokens), groups, members, join codes, events with tombstones, and push subscriptions.

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

Local-only data lives only on the device and browser you use. Clearing app or site data erases it, so export a backup now and then. Group events are also stored on the server, so they survive a lost device. Export still works for any calendar.

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
- [ ] Use Orbit without an account; confirm nothing asks you to sign up
- [ ] Edit the same group event on two devices; confirm the 409 conflict prompt appears
- [ ] Go offline, edit a group event, reconnect; confirm it syncs
- [ ] Visit the tunnel domain from mobile data (outside your Wi-Fi)
- [ ] Restore the nightly SQLite backup to a scratch file and open it

Account and group tests (sign-up, join codes, roles, forgot password, `reset-2fa.js`, Android token) are listed in [`ORBIT-accounts.md`](ORBIT-accounts.md).

---

## Known limitations

- The week view shows about three days at once on a phone; swipe sideways for the rest
- Only one-off events can be dragged (repeating events are edited through the form); dragging works in month view only
- Reminders on Android may be delayed by battery saver; the app schedules the nearest 200 reminders within 60 days
- Groups need the server running; local-only calendars keep working without it
- Conflicts are resolved by the user, not merged automatically
- Anyone with a valid join code can join, so keep codes private
- Anyone with both the phone and the password can sign in and reset the password
- A single Raspberry Pi is a single point of failure. The Pi being offline means groups can't sync, though each device still works from its copy
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
10. Passkeys as a sign-in option alongside passwords

---

## Notes for committing

- Do not commit `android/local.properties` (it holds your SDK path); add it to `.gitignore`
- Do not commit `server/.env`, `google-services.json`, the Cloudflare credentials file, or any `*.db` file
- `android/app/src/main/assets/public/` is regenerated by `npx cap sync android`
- Run `npm run lint` before committing
