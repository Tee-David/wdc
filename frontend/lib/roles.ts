import "server-only";

/**
 * WHO IS SIGNING IN, AND WHERE THEY BELONG.
 *
 * One table. The login page, the post-sign-in dispatcher and any future
 * middleware all read it, so a role can never be sent to two different places
 * depending on which file answered the question.
 *
 * `home` is where the role belongs. `ready` says whether that page exists in
 * this build. A role whose area is not built yet lands on /signed-in, which
 * tells them so honestly rather than dropping them on a 404 or -- far worse --
 * on somebody else's dashboard. When the area ships, flip one flag here.
 */
/* The three the database can actually hold. The column is a STRING, and
   `user_role_check` (migration 0019) is what holds it to these three, so a
   fourth value is a migration, not a line of TypeScript. (`roleEnum` in
   lib/db/schema.ts is a typed description of the same list, not a Postgres
   enum the database enforces.) */
export type Role = "owner" | "staff" | "client";

type Door = { home: string; ready: boolean; label: string };

const DOORS: Record<Role, Door> = {
  owner:  { home: "/admin",  ready: true,  label: "the agency admin" },
  /* Staff get a narrower view of the same admin: clients, projects, forms
     and content, never the books or the settings (lib/admin/permissions.ts). */
  staff:  { home: "/admin",  ready: true,  label: "your team workspace" },
  client: { home: "/portal", ready: true,  label: "your project portal" },
};

const FALLBACK: Door = { home: "/signed-in", ready: true, label: "your account" };

export function doorFor(role: string | null | undefined): Door {
  return DOORS[(role ?? "") as Role] ?? FALLBACK;
}

/** Where this person should land, or /signed-in when their area is not built. */
export function homeFor(role: string | null | undefined): string {
  const door = doorFor(role);
  return door.ready ? door.home : "/signed-in";
}

/** What to call their destination in a sentence. */
export function doorLabel(role: string | null | undefined): string {
  return doorFor(role).label;
}

/**
 * A requested `?redirect=` is caller-supplied, so it is treated as one:
 * relative paths only, no protocol-relative `//host` sneaking past, and only
 * if it sits inside an area this role is actually allowed into. Anything else
 * falls back to their own home rather than being followed.
 */
export function safeDestination(
  requested: string | null | undefined,
  role: string | null | undefined,
): string {
  const home = homeFor(role);
  if (!requested) return home;
  if (!requested.startsWith("/") || requested.startsWith("//")) return home;

  const door = doorFor(role);
  if (!door.ready) return home;
  return requested === door.home || requested.startsWith(`${door.home}/`)
    ? requested
    : home;
}
