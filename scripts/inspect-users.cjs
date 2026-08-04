/* TEMP diagnostic — prints per-user fields the evening classifier reads.
   Run: node scripts/inspect-users.cjs  */
require("dotenv").config?.();
const fs = require("fs");
const path = require("path");

let raw = process.env.FIREBASE_SERVICE_ACCOUNT ?? "";
if (!raw) {
  const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  const m = env.match(/^FIREBASE_SERVICE_ACCOUNT=(.+)$/m);
  if (m) raw = m[1].trim();
}
const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
const serviceAccount = JSON.parse(json);

const { cert, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const app = initializeApp({ credential: cert(serviceAccount) }, "inspect");
const db = getFirestore(app);

async function main() {
  const users = await db.collection("users").listDocuments();
  for (const ref of users) {
    const d = (await ref.get()).data() ?? {};
    const active = (d.activeDates ?? []).slice(-7);
    const frozen = (d.frozenDays ?? []).slice(-7);
    const broken = (d.brokenDays ?? []).slice(-7);
    console.log("----", ref.id);
    console.log("  name           :", d.displayName ?? "(none)");
    console.log("  timeZone       :", d.timeZone ?? "(null → Asia/Kolkata)");
    console.log("  streak         :", d.streak ?? 0);
    console.log("  streakFreezes  :", d.streakFreezes ?? 0);
    console.log("  lastActiveDate :", d.lastActiveDate ?? null);
    console.log("  dailyPuzzleDone:", d.dailyPuzzleCompletedDate ?? null);
    console.log("  frozenDays     :", JSON.stringify(frozen));
    console.log("  brokenDays     :", JSON.stringify(broken));
    console.log("  activeDates(7) :", JSON.stringify(active));
    const subs = await ref.collection("pushTokens").get();
    console.log("  pushTokens     :", subs.size);
  }
  console.log("TODAY local  :", new Date().toDateString());
}
main().catch((e) => { console.error(e); process.exit(1); });
