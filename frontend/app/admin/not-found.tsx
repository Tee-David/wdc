import Link from "next/link";
import { SearchX } from "lucide-react";
import { Empty } from "@/components/admin/bits";
import { adminRole } from "@/lib/admin/guard";
import { can, type Area } from "@/lib/admin/permissions";

const PLACES: { href: string; label: string; area: Area }[] = [
  { href: "/admin/clients", label: "Clients", area: "clients" },
  { href: "/admin/projects", label: "Projects", area: "projects" },
  { href: "/admin/money", label: "Money", area: "money" },
  { href: "/admin/forms", label: "Forms", area: "forms" },
  { href: "/admin/blog", label: "Blog", area: "content" },
];

/**
 * The admin's own not-found page.
 *
 * BEFORE THIS, THERE WASN'T ONE. Every one of the four dynamic detail routes
 * (`clients/[id]`, `projects/[id]`, `money/[id]`, `forms/[id]`) calls
 * `notFound()` on a deleted or mistyped id, and with no boundary in `app/admin`
 * that fell all the way through to the ROOT `app/not-found.tsx` -- the public
 * marketing 404, complete with the site header, the "lost" illustration and
 * the `.pv` light/dark tokens. An admin who followed a stale link out of an
 * old email would leave the dashboard entirely rather than land on a page that
 * still looks like the tool they were using.
 *
 * A `not-found.tsx` placed in a route segment still renders inside that
 * segment's own layout, so this one keeps the admin shell -- the nav, the
 * counts, the signed-in owner -- and only swaps the content area.
 */
export default async function AdminNotFound() {
  /* Only the places this person can open: a link that answers with "not
     allowed" is a second dead end behind the first. */
  const role = await adminRole();
  const places = PLACES.filter((p) => can(role, p.area)).slice(0, 4);
  return (
    <Empty
      title="That isn't here"
      icon={SearchX}
      action={
        <div className="ad__row">
          <Link className="ad__btn ad__btn--primary" href="/admin">Dashboard</Link>
          {places.map((p) => <Link key={p.href} className="ad__btn" href={p.href}>{p.label}</Link>)}
        </div>
      }
    >
      Whatever this link pointed at has been deleted, or the address was
      typed wrong. Pick where to go next.
    </Empty>
  );
}
