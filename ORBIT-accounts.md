# Orbit: Accounts, Groups, and Sign-In

Orbit is a personal calendar first. Nothing needs an account to use it. An account is only needed to share a calendar with other people through a group. Every account uses an authenticator app for one-time codes. Nothing in this design sends email.

---

## Overview

- **Personal use:** Orbit works as it always has. Events stay on the device, no account, no server.
- **Accounts:** created when someone wants to join or create a group. Username, password, and an authenticator app.
- **Groups:** a shared calendar that an account creates. Orbit generates a join code for it, like `ORB-7KQ2`, that others enter to join.
- **Signing in on other devices:** username and password only.
- **Forgot password:** reset with a one-time code from the authenticator app.

---

## Creating an account

1. Choose **Sign up** (from the sign-in screen or the Groups page).
2. Choose a username and password. Usernames are 3 to 20 letters, numbers, or underscores, and aren't case-sensitive.
3. Set up the authenticator app: scan the QR code, then enter the 6-digit code the app shows.
4. Save the **10 recovery codes** shown at the end. Each works once, in place of an app code.

Signing up doesn't join anyone to a group. It only creates the account.

---

## Creating a group

1. Signed in, open **Groups → New group**.
2. Give it a name, such as "Party" or "Flatmates".
3. Orbit creates the group and shows its join code, like `ORB-7KQ2`, and a QR code.
4. The creator is the owner.

Join codes use letters and numbers with the confusing ones removed (no 0, O, 1, I), so they're easy to read out or type.

**Code options (set by the owner)**
- Expiry: 1 day, 7 days, or 30 days (default 30).
- Member limit: up to 50 people per code.
- Rotate: makes a new code and cancels the old one. People already in the group stay in.

---

## Joining a group

1. Enter the join code, or scan the QR code, in **Groups → Join**.
2. If you're signed in, you're added to the group straight away.
3. If you're not signed in, Orbit asks you to sign up first, then adds you to the group.

Anyone can join with the code until it expires or hits its limit. Keep the code in the group chat, not on a public page.

An account can be in as many groups as needed. Each group appears in the sidebar beside your personal calendars.

---

## How group calendars work

- Group events are visible to everyone in the group, with the role they were given.
- Personal events never go to a group, even if they're on the same device.
- Group events show in the same month, week, and day views, marked with the group's colour.
- Events you add to a group are visible to the group. Your personal calendar stays private.

**Roles**

| Role | Can do |
| --- | --- |
| Owner | Everything: rename the group, manage codes, change roles, remove members, delete the group |
| Editor | Add, change, and delete group events |
| Viewer | See group events only |

Anyone who joins with a code becomes an editor by default. The owner can change that to viewer for a specific person.

---

## Signing in on another device

Use the username and password. That's it.

- The browser gets a session cookie that lasts 90 days.
- The Android app gets a token that stays valid until the user signs out or it's revoked.
- Each device signs in separately.

Because a new device only asks for the password, the password is what protects the account. Use a password manager, or a passphrase of a few random words.

**Sign out** ends the current device only.

**Sign out other devices** is on the account page. It ends every session except the current one.

---

## Forgot password

1. On the sign-in page, choose **Forgot password**.
2. Enter your username and the current 6-digit code from your authenticator app. A recovery code also works.
3. Set a new password.
4. All sessions are signed out. Sign in again on each device with the new password.

No one needs to contact you. Each code works once, and wrong codes are rate-limited.

---

## Changing your password

While signed in, go to **Account → Change password**. Other sessions are signed out. The current device stays signed in.

---

## Lost the phone and the recovery codes

This is the only case that needs you. Run this on the Pi:

```bash
node server/scripts/reset-2fa.js alice
```

The password stays the same. The next time Alice signs in, the app asks her to set up a new authenticator.

---

## Authenticator app details

- Works with Google Authenticator, Aegis, Bitwarden, 1Password, and any app that supports standard TOTP.
- Codes are 6 digits and change every 30 seconds. The server accepts the current code and the one before or after it.
- Each code works once, so a captured code can't be replayed.

**Protect the phone.** Anyone with the phone and the password can sign in and reset the password.

---

## Password rules and protection

- Minimum 10 characters. No forced complex rules.
- Passwords are hashed with argon2id. The server never keeps the plain password.
- Recovery codes are stored as hashes. The 2FA secret is encrypted with a key kept in `server/.env`.
- Sign-in attempts are rate-limited per username and per IP address. The delay grows after each failure, up to one minute.
- After 10 failed attempts on one account within an hour, sign-in for that account pauses for 15 minutes.
- Join codes are rate-limited per IP to stop guessing.
- Error messages never say whether a username exists.

---

## Admin commands (run on the Pi)

| Command | What it does |
| --- | --- |
| `node server/scripts/reset-2fa.js <username>` | Removes the authenticator setup; the person sets up a new one at next sign-in |
| `node server/scripts/unlock.js <username>` | Clears a sign-in pause after failed attempts |
| `node server/scripts/list-users.js` | Lists usernames, join dates, and whether 2FA is set up |

---

## Server endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | `{ username, password }`: create an account, returns the 2FA setup |
| POST | `/api/auth/2fa/confirm` | `{ code }`: finish setup and return 10 recovery codes |
| POST | `/api/auth/login` | `{ username, password }`: returns a session or token |
| POST | `/api/auth/reset/2fa` | `{ username, code, newPassword }`: forgot-password reset |
| POST | `/api/auth/password` | `{ currentPassword, newPassword }` while signed in |
| POST | `/api/auth/recovery-codes` | Generate 10 new recovery codes (old ones stop working) |
| POST | `/api/auth/logout` | End the current session |
| GET | `/api/sessions` | List sessions for the account |
| DELETE | `/api/sessions/:id` | Sign out one device |
| POST | `/api/sessions/others` | Sign out all other devices |
| GET | `/api/groups` | Groups the account belongs to |
| POST | `/api/groups` | `{ name }`: create a group and get its join code |
| PATCH | `/api/groups/:id` | Rename, change code settings, or rotate the code |
| POST | `/api/groups/join` | `{ code }`: join a group (account required) |
| DELETE | `/api/groups/:id/members/:userId` | Remove a member (owner only) |
| PATCH | `/api/groups/:id/members/:userId` | Change a member's role (owner only) |
| GET | `/api/groups/:id/events?since=` | Pull group events |
| PUT | `/api/groups/:id/events/:eventId` | Create or update a group event (editors and owner) |
| DELETE | `/api/groups/:id/events/:eventId` | Delete a group event (soft delete) |

---

## Test checklist

- [ ] Use Orbit without an account; confirm nothing asks you to sign up
- [ ] Sign up, set up the authenticator, and save recovery codes
- [ ] Create a group; confirm the join code and QR code appear
- [ ] Join with the code from a second account; confirm they become an editor
- [ ] Join with the code while signed out; confirm sign-up comes first, then the join
- [ ] Confirm an expired code and a code over its member limit are refused
- [ ] Rotate the code; confirm the old one stops working and members stay
- [ ] Change a member to viewer; confirm they can't add or edit events
- [ ] Confirm personal events never appear in the group
- [ ] Sign in on a second browser with username and password only
- [ ] Forgot password: a wrong code fails, the right code sets a new password, and sessions are signed out
- [ ] Run `reset-2fa.js`; confirm sign-in asks for a new authenticator and the password still works
- [ ] Sign in on Android and confirm the token survives an app restart

---

## Notes

- Keep `server/.env` out of git. It holds the key that protects 2FA secrets.
- Back up the database and `.env` together. Without the key, 2FA secrets can't be read.
- Store recovery codes in a password manager, not in a chat.
