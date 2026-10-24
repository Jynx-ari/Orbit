# Orbit

**Your calendar, your space.**

Orbit is a personal calendar and schedule planner designed for one person: you. The goal is to make it easy to see what is coming up, organize your time, and manage events without needing a team workspace, an account, or a cloud service.

Orbit is being built gradually as a learning project. The feature list below describes the intended direction, not a claim that every feature already works.

## The Goal

Build a clean, comfortable, dark-themed calendar that helps an individual manage their schedule while keeping their information under their own control.

Orbit should eventually let you:

- See your schedule at a glance.
- Create, edit, move, and delete events.
- Switch between different calendar views depending on what you need.
- Organize events with categories and colors.
- Keep your calendar data saved on your own device.
- Use the app even when offline.
- Export or import your calendar data so it is not trapped in the app.

The focus for the first version is **personal use, local storage, and a simple experience**. Shared calendars, collaboration, user accounts, and a hosted backend are outside the initial scope.

## Design Principles

- **Personal first:** designed around one person's schedule, not a team.
- **Local-first:** calendar data should stay on the user's device by default.
- **Offline-friendly:** core calendar features should work without an internet connection.
- **Simple and readable:** a clear layout, useful spacing, and an interface that does not get in the way.
- **Data portability:** users should be able to back up and restore their own calendar data.
- **Built to learn:** features will be developed in small steps, with maintainable code and an understandable structure.

## Planned Features

### 1. Calendar Views

- [ ] **Month view** — see the whole month and the events on each day.
- [ ] **Week view** — inspect a week in more detail.
- [ ] **Day view** — focus on one day's schedule.
- [ ] **Agenda view** — browse upcoming events as a list.
- [ ] Previous/next navigation for the selected period.
- [ ] A shortcut to return to today.
- [ ] Clear highlighting for today and the selected date.

### 2. Event Management

- [ ] Create an event with a title, date, start time, and end time.
- [ ] Edit an event after creating it.
- [ ] Delete an event.
- [ ] Support all-day events.
- [ ] Add an optional description or notes.
- [ ] Display events in the correct place in each calendar view.
- [ ] Handle events that span across multiple days.

### 3. Categories and Organization

- [ ] Create and assign categories, such as School, Personal, Projects, or Other.
- [ ] Give categories distinct colors.
- [ ] Filter the calendar by category.
- [ ] Make event details easy to scan without overcrowding the calendar.

### 4. Recurring Events

- [ ] Repeat events daily, weekly, monthly, or yearly.
- [ ] Choose when a repeating schedule should end.
- [ ] Edit or remove a single occurrence or the series, where practical.

### 5. Reminders

- [ ] Set an optional reminder for an event.
- [ ] Show upcoming-event reminders when the app is open.
- [ ] Explore browser notifications where the platform and user permissions allow them.

*Reminder delivery may be limited by browser and operating-system behavior, especially while the app is closed. Reliable background notifications will need to be tested separately.*

### 6. Saving and Managing Data

- [ ] Save calendar data locally so it remains after refreshing or reopening the app.
- [ ] Use browser storage such as IndexedDB for structured calendar data.
- [ ] Export calendar data to a JSON file for backup.
- [ ] Import a previously exported JSON file.
- [ ] Validate imported data and handle invalid files safely.
- [ ] Provide a clear way to reset local calendar data, with confirmation.

### 7. Progressive Web App (PWA) and Offline Use

- [ ] Make Orbit installable where supported by the browser.
- [ ] Cache the app's essential files for offline use.
- [ ] Ensure calendar viewing and editing continue to work offline.
- [ ] Explain when a feature requires browser support or an internet connection.

### 8. Interface and Usability

- [x] Initial dark dashboard layout.
- [x] Sidebar navigation and calendar workspace structure.
- [x] Basic previous/next month state and month label.
- [ ] Replace the calendar placeholder with a functional calendar grid.
- [ ] Add a proper event creation and editing form.
- [ ] Improve mobile and narrow-screen layouts.
- [ ] Add useful empty states, confirmation prompts, and error messages.
- [ ] Improve keyboard navigation and accessibility.
- [ ] Use consistent icons and interaction feedback.

### 9. Possible Later Improvements

These are ideas for after the core personal calendar works well:

- [ ] Search events by title or description.
- [ ] Keyboard shortcuts for common actions.
- [ ] A customizable first day of the week and time format.
- [ ] Light/dark theme options.
- [ ] Calendar data export in a standard format such as iCalendar (.ics).
- [ ] Optional local encrypted backup, if it can be implemented without making the app difficult to use.

These are possibilities, not commitments. They should only be added if they improve the core experience.

## What Orbit Is Not (Initially)

To keep the first version achievable and maintainable, Orbit is not initially intended to include:

- Multiple user accounts or sign-in.
- Shared calendars or real-time collaboration.
- A cloud database or mandatory online service.
- Paid APIs or AI-dependent features.
- A requirement to create an account just to use the calendar.

The app should remain useful as a standalone personal tool.

## Development Roadmap

The work will be done in small, testable stages rather than building every feature at once.

1. **Dashboard foundation** — layout, styling, and month navigation.
2. **Calendar grid** — correctly display dates and select a day.
3. **Event basics** — create, display, edit, and delete events.
4. **Persistence** — keep events after reloads using local storage technology suited to the data.
5. **Calendar views and organization** — week/day/agenda views, categories, and filters.
6. **Recurring events and reminders** — add scheduling conveniences carefully.
7. **Import/export** — make backups and restore straightforward.
8. **PWA and offline testing** — installability, caching, and real-world testing.
9. **Polish** — accessibility, responsive layout, error handling, and usability improvements.

The order may change as the project develops. A feature should be considered complete only after it works and has been tested, not merely because it appears in this list.

## Technology

The current project uses:

- **React** — build the interface from reusable components.
- **Vite** — run the development server and build the app.
- **JavaScript** — implement the app's behavior.
- **CSS** — control layout, appearance, and responsive styling.

Local persistence and PWA tooling will be chosen when those stages are reached.

## Running Orbit Locally

You will need Node.js and npm installed.

1. Clone the repository:

   ```bash
   git clone https://github.com/Jynx-ari/Orbit.git
   cd Orbit
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the local URL printed in the terminal, usually `http://localhost:5173/`.

To create a production build, run:

```bash
npm run build
```

## Project Status

Orbit is in early development. The dashboard layout and basic month-navigation behavior are in place; the actual calendar grid, event management, persistent data, reminders, and offline installation are still planned work.

This README is a living plan. As features are implemented and tested, their checkboxes and descriptions should be updated to reflect what the app really supports.

---

*Orbit — your time, in orbit.*
