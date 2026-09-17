import Link from "next/link";
import { SearchX } from "lucide-react";
import { Empty } from "@/components/admin/bits";

export default function PortalNotFound() {
  return (
    <Empty
      title="That isn't here"
      icon={SearchX}
      action={
        <div className="ad__row">
          <Link className="ad__btn" href="/portal">Overview</Link>
          <Link className="ad__btn" href="/portal/projects">Projects</Link>
          <Link className="ad__btn" href="/portal/billing">Billing</Link>
        </div>
      }
    >
      Whatever this link pointed at has been moved, or the address was typed
      wrong. Pick where to go next.
    </Empty>
  );
}
