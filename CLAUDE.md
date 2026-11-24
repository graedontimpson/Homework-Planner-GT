# Homework Planner GT

A homework and goal planner web app, built for the AI Mastermind class (teacher: Mr. Zitting).
Mr. Zitting tracks progress through this GitHub repo's commit history, so make small commits with clear messages.

## About the owner
- New to coding: explain each change in plain, simple words.
- Keep work token-efficient: make small, targeted edits, don't rewrite whole files, and skip long recaps.

## How it's built
- Everything is in one file, `index.html`, with plain HTML, CSS and JavaScript. There are no frameworks and no build step.
- It is hosted on GitHub Pages from the `main` branch root: https://graedontimpson.github.io/Homework-Planner-GT/
- Pushing to `main` updates the live site after about a minute.

## Features
- Tabs: Today, Week, Classes, Goals, Notes, Progress. On phone-width screens the tab bar sits at the bottom.
- Assignments have a class, due date and time, a reminder, and notes. They can be edited (✎) or deleted (×).
- Goals ("Edit goal" button), steps (✎) and notes (✎) can be edited too. All edits reuse the same form as adding, filled in with the saved values.
- Classes have a teacher, period, room and color, and can be edited. Finished homework is hidden behind a "Show finished" button.
- Goals have an area (School, Gym, Diet, Personal), a deadline, steps with optional dates, and notes. A progress bar shows how many steps are done.
- Notes can stand alone or be attached to a class or goal.
- Deleting takes two taps ("Tap again to delete"). Don't use `confirm()` or `alert()`, because the Claude app's built-in browser blocks them.
- Required form fields show a custom "Please fill this in" message. The form uses `noValidate` because some browsers hide the built-in validation message.
- Progress tab: a report for teachers with this week's finished assignments, overdue and upcoming counts, and homework by class. "Save as PDF" calls `window.print()`; print CSS hides everything except `.report`.
- Backup and restore: download all data as a JSON file and load it back.
- Reminders: while the app is open, the browser Notification API checks every 30 seconds. Push reminders work when the app is closed: the "Push reminders" panel subscribes the device (`sw.js` shows the message), and `.github/workflows/reminders.yml` runs `.github/reminders/send.mjs` every 5 minutes to send them. On iPhone, push only works after Add to Home Screen (`manifest.json`). A device with push on skips the in-tab check so reminders don't show twice.
- Push needs two GitHub repo secrets: `FIREBASE_SERVICE_ACCOUNT` (the service account JSON from Firebase) and `VAPID_PRIVATE_KEY`. The VAPID public key is in both `index.html` and `send.mjs`.

## Data
- All data lives in one object, `S = { classes, items, goals, notes }`, saved in localStorage under the key `hpgt-v1`.
- `save()` writes to localStorage, re-renders the page, and calls `window.cloudSave(S)`.
- Classes: `{id, name, teacher, period, room, color}`
- Items (assignments): `{id, title, classId, due:'YYYY-MM-DD', time:'HH:MM', remind:minutes|-1(7 AM on the due date)|null, notes, done, doneAt:'YYYY-MM-DD' (set when checked off; older items don't have it, so the report uses the due date), notified}`
- Goals: `{id, title, area, deadline, steps:[{id, label, date, done}]}`
- Notes: `{id, text, date, classId, goalId}`

## Sync (Firebase)
- Firebase project: `homework-planner-gt` (free Spark plan). Sign-in is Google only.
- The Firebase web config in `index.html` is meant to be public. The Firestore rules are what keep data private.
- Firestore stores one document per user at `users/{uid}` with the fields `{ data: JSON string of S, updated, subs: {deviceId: push subscription + tz}, sent: {"itemId@time": when} }`. Saves use `merge: true` so `subs` and `sent` aren't erased.
- Rules: a user can read and write only `users/{their uid}`.
- `graedontimpson.github.io` is listed as an authorized domain in Firebase Authentication.
- The sync code is the `<script type="module">` at the bottom of `index.html`, using Firebase JS SDK 11.0.2 from gstatic.
- On the first sign-in, if there is no cloud document yet, the browser's data is uploaded. After that, the cloud copy wins, and `onSnapshot` applies changes made on other devices.

## Design
A design canvas made in Claude has mockups of the Week, Today, Add assignment, Classes and Goals screens.
- Look: Inter for body text, Space Grotesk for headings, off-white background `#F7F7F5`, blue accent `#2F5BEA`.
- Each class gets its own color.

## Ideas for later
- A live share link for the progress page (needs a public Firestore doc and a rules change).

## To do
- Add Mr. Zitting as a collaborator once the owner has his GitHub username.
