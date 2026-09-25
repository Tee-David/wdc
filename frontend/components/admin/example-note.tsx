import { getClients } from "@/lib/admin/store";
import { DemoNote } from "./bits";

/* The five clients the books started with, and everything hanging off them. */
const EXAMPLES = new Set(["c1", "c2", "c3", "c4", "c5"]);

/**
 * SAID WHILE IT IS TRUE, AND ONLY THEN. The admin starts with five example
 * clients and their projects and money, so the screens have something to show.
 * Everything added or changed is kept (lib/admin/persist.ts). Once the
 * examples are archived this says nothing, because there is nothing to say.
 */
export function ExampleNote() {
  const left = getClients().filter((c) => EXAMPLES.has(c.id));
  if (!left.length) return null;
  const names = left.slice(0, 2).map((c) => c.company).join(", ");
  const more = left.length > 2 ? ` and ${left.length - 2} more` : "";
  return (
    <DemoNote>
      {names}{more} are example clients, with example projects and invoices, so every screen has something to show.
      What you add or change is saved. Archive the examples once your real clients are in.
    </DemoNote>
  );
}

/** For the portal: only an example account is told it is one. */
export function PortalExampleNote({ clientId }: { clientId: string }) {
  if (!EXAMPLES.has(clientId)) return null;
  return <DemoNote>This is an example account, shown so the portal has something in it.</DemoNote>;
}
