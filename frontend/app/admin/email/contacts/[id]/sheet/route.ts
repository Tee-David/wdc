import { NextResponse } from "next/server";
import { allow } from "@/lib/admin/guard";
import { eventsFor, getContact, openRate, opensFor, sendsFor } from "@/lib/contacts";

export const dynamic = "force-dynamic";

/**
 * Everything the contact side sheet shows that the list does not already
 * carry: the person themselves (so a sheet can open for someone who is not on
 * this page of the list), their notes and history, the campaigns that reached
 * them, and how many they opened. A refusal is a 404, like the other admin routes.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (await allow("settings")) return new NextResponse("Not found", { status: 404 });
  const { id } = await params;
  const contact = await getContact(id.slice(0, 80));
  if (!contact) return new NextResponse("Not found", { status: 404 });
  const [events, sends, opens] = await Promise.all([eventsFor(contact.id), sendsFor(contact.id), opensFor([contact.id])]);
  return NextResponse.json(
    { contact, events: events.map((e) => ({ id: e.id, kind: e.kind, title: e.title, detail: e.detail, by: e.by, at: new Date(e.at).toISOString() })), sends, opens: openRate(opens.get(contact.id)) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
