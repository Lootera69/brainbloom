"use client";

const CODES_KEY = "brainbloom-invite-codes";

const DEFAULT_CODES: Record<string, string> = {
  "alpha-2026": "bloom@123",
  "beta-2026": "bloom@456",
  "gamma-2026": "bloom@789",
};

export function getInviteCodes(): Record<string, string> {
  if (typeof window === "undefined") return DEFAULT_CODES;
  try {
    const raw = localStorage.getItem(CODES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CODES };
}

export function saveInviteCodes(codes: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CODES_KEY, JSON.stringify(codes));
}

export function addInviteCode(code: string, password: string): boolean {
  const codes = getInviteCodes();
  if (codes[code]) return false;
  codes[code] = password;
  saveInviteCodes(codes);
  return true;
}

export function removeInviteCode(code: string) {
  const codes = getInviteCodes();
  delete codes[code];
  saveInviteCodes(codes);
}

export function verifyStudioCredentials(code: string, password: string): boolean {
  const codes = getInviteCodes();
  return codes[code] === password;
}
