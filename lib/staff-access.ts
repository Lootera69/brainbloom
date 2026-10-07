export type StaffRole = "admin" | "contributor" | "reviewer";

export function staffRole(data: Record<string, unknown> | undefined): StaffRole | null {
  return data?.enabled === true && (data.status === undefined || data.status === "active")
    && (data.role === "admin" || data.role === "contributor" || data.role === "reviewer")
    ? data.role : null;
}

export function canReviewRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "reviewer";
}

export function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}
