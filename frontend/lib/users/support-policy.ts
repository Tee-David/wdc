export const SUPPORT_COOKIE = "wdc-support-view";
export const SUPPORT_MINUTES = 15;
export const SUPPORT_EXIT = "/api/support/exit";
export const SUPPORT_READ_ONLY = "This is a read-only support view. Exit it before making changes.";

/** No identity swap at the auth layer. A scoped portal view never grants mutation authority. */
export function supportRequestAllowed(path: string, method: string): boolean {
  if (path === SUPPORT_EXIT) return method === "POST";
  return (method === "GET" || method === "HEAD") && /^\/portal(?:\/(?:projects|support|meetings)(?:\/[A-Za-z0-9_-]+)?|\/(?:billing|settings))?\/?$/.test(path);
}
