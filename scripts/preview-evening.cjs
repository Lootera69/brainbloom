/* TEMP preview — simulates sendEveningPushForLocalHour classification for the
   current Firestore user docs. Run: node scripts/preview-evening.cjs  */
const fs = require("fs");
const path = require("path");

let raw = process.env.FIREBASE_SERVICE_ACCOUNT ?? "";
if (!raw) {
  const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  const m = env.match(/^FIREBASE_SERVICE_ACCOUNT=(.+)$/m);
  if (m) raw = m[1].trim();
}
const serviceAccount = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
const { cert, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const app = initializeApp({ credential: cert(serviceAccount) }, "preview");
const db = getFirestore(app);

const DAY_MS = 86400000;
function localDateStringAt(now, tz) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", year: "numeric", month: "short", day: "2-digit" }).formatToParts(now);
    const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("weekday")} ${get("month")} ${get("day")} ${get("year")}`;
  } catch { return now.toDateString(); }
}
function computeStreakState(now, tz, lastActiveDate, storedStreak, activeDates, frozenDays) {
  const todayLocal = localDateStringAt(now, tz);
  const playedToday = lastActiveDate === todayLocal || activeDates.includes(todayLocal);
  let alive = false;
  if (lastActiveDate && /^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}$/.test(lastActiveDate)) {
    const lastMs = new Date(lastActiveDate).getTime();
    const todayMs = new Date(todayLocal).getTime();
    if (!Number.isNaN(lastMs) && !Number.isNaN(todayMs) && lastMs <= todayMs && todayMs - lastMs <= 370 * DAY_MS) {
      alive = true;
      for (let ms = lastMs + DAY_MS; ms < todayMs; ms += DAY_MS) {
        if (!frozenDays.includes(localDateStringAt(new Date(ms), tz))) { alive = false; break; }
      }
    }
  }
  return { playedToday, alive, streak: alive ? Math.max(1, storedStreak) : 0 };
}

const TEMPLATES = {
  completedStreak: { title: "Rhythm, {streak} days deep", body: "Consistency is its own discipline. Return tomorrow and let the chain hold." },
  completedFresh: { title: "The first stone is laid", body: "Your first completion is recorded. Step back tomorrow and a streak begins its hold." },
  streakWarning: { title: "Your chain is still breathing", body: "A {streak}-day streak waits to endure. Finish today's challenge before midnight." },
  freezeSafe: { title: "A shield stands ready", body: "Your {streak}-day chain is insured for tonight, but freezes are meant to stay unspent. Play and keep it clean." },
  restart: { title: "Conclusions are not the end", body: "Your streak paused, but your training endures. One session today opens the next chapter." },
  newUser: { title: "Your mind, exercised", body: "A single session begins the regimen. Start your first streak tonight." },
};

async function main() {
  const now = new Date();
  const users = await db.collection("users").listDocuments();
  for (const ref of users) {
    const d = (await ref.get()).data() ?? {};
    const subs = await ref.collection("pushTokens").get();
    const st = computeStreakState(now, d.timeZone ?? "Asia/Kolkata", d.lastActiveDate ?? null, d.streak ?? 0, d.activeDates ?? [], d.frozenDays ?? []);
    const hasHistory = (d.activeDates ?? []).length > 0 || (d.streak ?? 0) > 0;
    let t;
    if (st.playedToday && st.streak >= 2) t = "completedStreak";
    else if (st.playedToday) t = "completedFresh";
    else if (st.alive && st.streak >= 1 && (d.streakFreezes ?? 0) > 0) t = "freezeSafe";
    else if (st.alive && st.streak >= 1) t = "streakWarning";
    else if (hasHistory) t = "restart";
    else t = "newUser";
    const tmp = TEMPLATES[t];
    const title = tmp.title.replace("{streak}", String(st.streak));
    const body = tmp.body.replace("{streak}", String(st.streak));
    console.log(`[${subs.size} token(s)] ${d.displayName ?? "(none)"} | lastActive=${d.lastActiveDate ?? "—"} streak=${d.streak ?? 0} freezes=${d.streakFreezes ?? 0} playedToday=${st.playedToday} alive=${st.alive} → ${t}: "${title}" / "${body}"`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });