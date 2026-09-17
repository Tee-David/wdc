import Link from "next/link";
import { SearchX } from "lucide-react";
import { Empty } from "@/components/admin/bits";

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
export default function AdminNotFound() {
  return (
    <Empty
      title="That isn't here"
      icon={SearchX}
      action={
        <div className="ad__row">
          <Link className="ad__btn" href="/admin/clients">Clients</Link>
          <Link className="ad__btn" href="/admin/projects">Projects</Link>
          <Link className="ad__btn" href="/admin/money">Money</Link>
          <Link className="ad__btn" href="/admin/forms">Forms</Link>
        </div>
      }
    >
      Whatever this link pointed at has been deleted, or the address was
      typed wrong. Pick where to go next.
    </Empty>
  );
}
