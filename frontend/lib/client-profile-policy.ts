export const APPEARANCES = ['system','light','dark'] as const;
export type Appearance = typeof APPEARANCES[number];
export function appearanceValue(value: unknown): Appearance | null {
  return APPEARANCES.includes(value as Appearance) ? value as Appearance : null;
}
export function avatarOwnedBy(key: unknown, userId: string): key is string {
  return typeof key === 'string' && key.startsWith(`profiles/${encodeURIComponent(userId)}/`) && /^profiles\/[^/]+\/[0-9a-f-]{36}\.webp$/.test(key);
}
export const AVATAR_BYTES = 2 * 1024 * 1024;
export const AVATAR_PIXELS = 16_000_000;
