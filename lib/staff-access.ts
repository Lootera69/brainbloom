export type StaffRole = "admin" | "contributor";

export function staffRole(data: Record<string, unknown> | undefined): StaffRole | null {
  return data?.enabled === true && (data.role === "admin" || data.role === "contributor")
    ? data.role : null;
}

export function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}
