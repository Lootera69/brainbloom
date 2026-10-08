import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import type { Firestore } from 'firebase-admin/firestore';

export type GuestNetwork = { key: string; attested: boolean };
type GuestBudget = {
  version: 1;
  tokens: number;
  updatedAt: number;
  admissions: number[];
  expiresAt: number;
};
type BudgetResult = { allowed: true; record: GuestBudget } | { allowed: false; retryAfter: number };

export const guestLimits = {
  unverified: { burst: 60, perSecond: 1, hourlyAccounts: 12, dailyAccounts: 50 },
  verified: { burst: 180, perSecond: 3, hourlyAccounts: 60, dailyAccounts: 300 },
};
const hour = 3600000;
const day = 24 * hour;

export function canonicalNetwork(value: string): string | null {
  if (isIP(value) === 4) return `v4:${value}`;
  if (isIP(value) !== 6 || value.includes('%')) return null;
  const normalized = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const [left, right] = normalized.split('::');
  const before = left ? left.split(':') : [];
  const after = right ? right.split(':') : [];
  const words = (right === undefined ? before : [...before, ...Array(8 - before.length - after.length).fill('0'), ...after])
    .map((word) => Number.parseInt(word, 16));
  if (words.slice(0, 5).every((word) => word === 0) && words[5] === 65535) {
    return `v4:${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`;
  }
  return `v6:${words.slice(0, 4).map((word) => word.toString(16)).join(':')}/64`;
}

export function guestNetwork(request: Request, attested: boolean): GuestNetwork | undefined {
  if (process.env.VERCEL !== '1') return undefined;
  const secret = process.env.PLAYER_ABUSE_SECRET;
  if (!secret || secret.length < 32) throw new Error('Guest protection is not configured.');
  const address = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for');
  const network = address ? canonicalNetwork(address.trim()) : null;
  if (!network) throw new Error('Trusted network information is unavailable.');
  return { key: createHmac('sha256', secret).update(`guest-network-v1:${network}`).digest('hex'), attested };
}

export function takeGuestRequest(saved: Record<string, unknown> | undefined, now: number, attested: boolean): BudgetResult {
  const limits = attested ? guestLimits.verified : guestLimits.unverified;
  if (saved && (saved.version !== 1 || typeof saved.tokens !== 'number' || !Number.isFinite(saved.tokens)
    || saved.tokens < 0 || typeof saved.updatedAt !== 'number' || !Number.isFinite(saved.updatedAt)
    || !Array.isArray(saved.admissions) || saved.admissions.length > guestLimits.verified.dailyAccounts
    || saved.admissions.some((time) => typeof time !== 'number' || !Number.isFinite(time)))) {
    throw new Error('Guest protection state is invalid.');
  }
  const prior = saved as GuestBudget | undefined;
  const tokens = Math.min(limits.burst, (prior?.tokens ?? limits.burst)
    + Math.max(0, now - (prior?.updatedAt ?? now)) * limits.perSecond / 1000);
  if (tokens < 1) return { allowed: false, retryAfter: Math.max(1, Math.ceil((1 - tokens) / limits.perSecond)) };
  return { allowed: true, record: {
    version: 1, tokens: tokens - 1, updatedAt: now,
    admissions: (prior?.admissions ?? []).filter((time) => time > now - day), expiresAt: now + 2 * day,
  } };
}

export function admitGuest(record: GuestBudget, now: number, attested: boolean): BudgetResult {
  const limits = attested ? guestLimits.verified : guestLimits.unverified;
  const hourly = record.admissions.filter((time) => time > now - hour);
  const waits = [
    ...(hourly.length >= limits.hourlyAccounts ? [Math.min(...hourly) + hour - now] : []),
    ...(record.admissions.length >= limits.dailyAccounts ? [Math.min(...record.admissions) + day - now] : []),
  ];
  if (waits.length) return { allowed: false, retryAfter: Math.max(1, Math.ceil(Math.max(...waits) / 1000)) };
  return { allowed: true, record: { ...record, admissions: [...record.admissions, now] } };
}

export async function removeExpiredGuestLimits(db: Firestore, now = Date.now()): Promise<number> {
  const expired = await db.collection('playerAbuse').where('expiresAt', '<=', now).limit(400).get();
  if (expired.empty) return 0;
  const batch = db.batch();
  for (const document of expired.docs) batch.delete(document.ref, { lastUpdateTime: document.updateTime });
  await batch.commit();
  return expired.size;
}
