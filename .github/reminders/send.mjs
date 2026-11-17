// Sends push reminders. GitHub Actions runs this every few minutes (see .github/workflows/reminders.yml).
import admin from 'firebase-admin';
import webpush from 'web-push';

if (!process.env.FIREBASE_SERVICE_ACCOUNT || !process.env.VAPID_PRIVATE_KEY) {
  console.log('Secret keys are not set up yet, so no reminders were sent.');
  process.exit(0);
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
webpush.setVapidDetails('https://graedontimpson.github.io/Homework-Planner-GT/',
  'BAUdwplGKET8vEMS9UEmg51hcgIJrGrLyN1sNDKjGYWcNpxO4K-jGSbCjEtoWMDNRjnS3htATVMF7XTYfCwOu4E',
  process.env.VAPID_PRIVATE_KEY);

const db = admin.firestore();
const now = Date.now(), LATE = 6 * 3600e3; // skip reminders more than 6 hours old

// Turns a local date and time (like 2026-11-18 15:00 in America/Denver) into a real moment
function zoned(date, time, tz) {
  const guess = Date.parse(`${date}T${time}:00Z`);
  const offset = t => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(t).map(x => [x.type, x.value]));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - t;
  };
  const t = guess - offset(guess);
  return guess - offset(t);
}
const fmt = d => new Date(d + 'T12:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

const users = await db.collection('users').get();
let total = 0;
for (const snap of users.docs) {
  const { data, subs = {}, sent = {} } = snap.data();
  if (!data || !Object.keys(subs).length) continue;
  const S = JSON.parse(data), tz = Object.values(subs)[0].tz || 'America/Denver';
  const keep = {}, update = {};
  for (const it of S.items || []) {
    if (!it.remind || it.done || it.notified || !it.due) continue;
    const at = it.remind === -1 ? zoned(it.due, '07:00', tz) : zoned(it.due, it.time || '23:59', tz) - it.remind * 60000;
    const key = `${it.id}@${at}`; // changes if the due date or reminder is edited
    if (sent[key]) { keep[key] = sent[key]; continue; }
    if (at > now || now - at > LATE) continue;
    const cls = (S.classes || []).find(c => c.id === it.classId);
    const payload = JSON.stringify({ title: 'Due soon: ' + it.title, tag: it.id,
      body: [cls?.name, fmt(it.due) + (it.time ? ' ' + it.time : '')].filter(Boolean).join(' · ') });
    for (const [id, sub] of Object.entries(subs)) {
      try { await webpush.sendNotification(sub, payload); total++; }
      catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) update['subs.' + id] = admin.firestore.FieldValue.delete(); // device unsubscribed
        else console.error('Push failed:', e.statusCode, e.body);
      }
    }
    keep[key] = now;
  }
  // Only remember reminders that still exist, so this list never grows forever
  if (JSON.stringify(keep) !== JSON.stringify(sent)) update.sent = keep;
  if (Object.keys(update).length) await snap.ref.update(update);
}
console.log(`Checked ${users.size} users, sent ${total} pushes.`);
