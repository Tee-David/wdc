import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Empty } from "./bits";

/**
 * A PROJECT, AN INVOICE OR AN ESTIMATE ALWAYS BELONGS TO A CLIENT. With none
 * yet (a fresh install, or every example archived) the create dialogs would
 * open on a required picker with nothing in it; they say so instead and point
 * at the one thing to do first.
 */
export function NoClientsYet({ what }: { what: string }) {
  return (
    <Empty title="Add a client first" icon={UserPlus}
      action={<Link className="ad__btn ad__btn--primary" href="/admin/clients?new=1">Add a client</Link>}>
      Every {what} belongs to a client. Add the client, then come back here.
    </Empty>
  );
}
