import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { migrateLegacyProgress } from "@/lib/server/player-migration";
import { readServiceAccount } from "@/lib/server/service-account";

type Data = Record<string, unknown>;
type Plan = { id: string; projectId: string; createdAt: number; rulesHash: string; records: { uid: string; hash: string; raw: Data; progress: Data }[] };
const hash = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const args = process.argv.slice(2);
const mode = args[0];
if (mode !== "--plan" && mode !== "--apply") throw new Error("Use --plan or --apply <plan-path>.");
try { loadEnvFile(".env.local"); } catch { }
if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error("FIREBASE_SERVICE_ACCOUNT is required.");
const serviceAccount = readServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
const projectId = serviceAccount.project_id;
const credential = cert(serviceAccount);
const app = initializeApp({ credential, projectId });
const db = getFirestore(app);
const rulesSource = await readFile("firestore.rules", "utf8");
const rulesHash = hash(rulesSource);

async function assertLocked() {
  const { access_token: accessToken } = await credential.getAccessToken();
  const get = async (path: string) => {
    const response = await fetch(`https://firebaserules.googleapis.com/v1/${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Cannot verify deployed rules (${response.status}). No migration allowed.`);
    return response.json();
  };
  const release = await get(`projects/${projectId}/releases/cloud.firestore`);
  const ruleset = await get(release.rulesetName);
  const active = ruleset.source.files.find((file: { name: string }) => file.name.endsWith("firestore.rules"));
  if (!active || hash(active.content) !== rulesHash || !rulesSource.includes("affectedKeys().hasOnly(profileFields())")) {
    throw new Error("The tested profile-only rules must be active before taking or applying a migration snapshot.");
  }
  const config = await db.doc("settings/player-security").get();
  if (config.data()?.enabled === true) throw new Error("Rewards must remain disabled until migration and client rollout are complete.");
}

await assertLocked();
if (mode === "--plan") {
  const createdAt = Date.now();
  const id = randomUUID();
  const snapshots = await db.collection("users").get();
  const records: Plan["records"] = [];
  const invalid: string[] = [];
  for (const snapshot of snapshots.docs) {
    if ((await db.doc(`accountDeletions/${snapshot.id}`).get()).exists) continue;
    const raw = JSON.parse(JSON.stringify(snapshot.data()));
    try {
      records.push({ uid: snapshot.id, raw, hash: hash(raw), progress: migrateLegacyProgress(raw, createdAt) as unknown as Data });
    } catch { invalid.push(snapshot.id); }
  }
  if (invalid.length) throw new Error(`Review these legacy records before migration: ${invalid.join(", ")}`);
  await mkdir(".private-invites", { recursive: true });
  const path = resolve(`.private-invites/player-migration-${id}.json`);
  const plan: Plan = { id, projectId, createdAt, rulesHash, records };
  await writeFile(path, JSON.stringify(plan, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ plan: path, users: records.length, rulesHash }));
} else {
  if (!args[1]) throw new Error("The saved migration plan path is required.");
  const plan = JSON.parse(await readFile(args[1], "utf8")) as Plan;
  if (plan.projectId !== projectId || plan.rulesHash !== rulesHash) throw new Error("Plan project or rules do not match.");
  await db.doc("settings/player-security").set({ enabled: false, migrationComplete: false, version: 1, migrationId: plan.id, paymentsEnabled: false });
  let migrated = 0;
  for (const record of plan.records) {
    const applied = await db.runTransaction(async (transaction) => {
      const source = db.doc(`users/${record.uid}`);
      const target = db.doc(`playerProgress/${record.uid}`);
      const backup = db.doc(`playerProgress/${record.uid}/legacySnapshots/${plan.id}`);
      const marker = db.doc(`playerProgress/${record.uid}/migrationReceipts/${plan.id}`);
      const [current, previous, completed, deleting, config] = await transaction.getAll(source, target, marker,
        db.doc(`accountDeletions/${record.uid}`), db.doc("settings/player-security"));
      if (config.data()?.enabled !== false || config.data()?.migrationId !== plan.id) throw new Error("Migration state changed.");
      if (deleting.exists) return false;
      if (completed.exists) {
        if (!previous.exists || completed.data()?.hash !== record.hash) throw new Error(`Checkpoint mismatch for ${record.uid}.`);
        return false;
      }
      if (previous.exists) throw new Error(`Trusted progress already exists for ${record.uid}.`);
      const raw = JSON.parse(JSON.stringify(current.data()));
      const economicFields = Object.keys(record.progress).filter((key) => !["version", "revision", "updatedAt"].includes(key));
      if (economicFields.some((key) => hash(raw[key] ?? null) !== hash(record.raw[key] ?? null))) {
        throw new Error(`Legacy rewards changed after the snapshot for ${record.uid}.`);
      }
      if (hash(record.raw) !== record.hash) throw new Error("The snapshot checksum is invalid.");
      const progress = migrateLegacyProgress(record.raw, plan.createdAt);
      transaction.create(backup, record.raw);
      transaction.create(target, { ...progress });
      transaction.set(source, { ...progress, progressVersion: 1 }, { merge: true });
      transaction.create(marker, { hash: record.hash, migratedAt: Date.now() });
      return true;
    });
    if (applied) migrated++;
  }
  await assertLocked();
  const users = await db.collection("users").get();
  for (const user of users.docs) {
    const [trusted, deleting] = await db.getAll(db.doc(`playerProgress/${user.id}`), db.doc(`accountDeletions/${user.id}`));
    if (!trusted.exists && !deleting.exists && ["xp", "gems", "tier", "completedPuzzleIds"].some((field) => field in user.data())) {
      throw new Error(`Unmigrated legacy progress remains for ${user.id}.`);
    }
  }
  await db.doc(`playerMigrations/${plan.id}`).set({ status: "complete", users: plan.records.length, completedAt: Date.now(), rulesHash });
  await db.doc("settings/player-security").set({ migrationComplete: true }, { merge: true });
  console.log(JSON.stringify({ migrated, total: plan.records.length, enabled: false, message: "Migration complete. Rewards remain disabled until client rollout is verified." }));
}
