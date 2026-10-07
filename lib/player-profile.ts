export const editableProfileFields = [
  "displayName", "email", "photoURL", "avatarId", "soundEnabled", "hapticsEnabled", "theme", "timeZone", "profileUpdatedAt",
] as const;

export function editableProfile(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(editableProfileFields.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
}
