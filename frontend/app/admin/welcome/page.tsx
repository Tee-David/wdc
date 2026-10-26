import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, UserRound } from "lucide-react";
import { getAdminRequest } from "@/lib/admin/session";
import { listDepartments } from "@/lib/departments";
import { getClients, getSetting } from "@/lib/admin/store";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { paystackConfig } from "@/lib/paystack";
import { db } from "@/lib/db/pool";
import { hydrateSettings } from "@/lib/settings/store";
import { PageHead } from "@/components/admin/page-head";
import { Workbench, RailCard } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { WelcomeSteps, type WelcomeStep } from "@/components/admin/welcome";
import { Form, Hidden, Submit } from "@/components/admin/form";
import { finishStaffWelcome } from "@/lib/admin/staff-welcome-actions";

export const metadata = { title: "Welcome" };

/**
 * THE WELCOME, for Admin and for new staff. Admin sees the steps that set the studio up, each marked done from the
 * records themselves (payments connected, a bank account added, a person invited, a client added, terms set). Staff
 * see where things are; a staff member meets this once, and the layout sends them here while their setup is pending.
 */
export default async function Welcome() {
  const { session } = await getAdminRequest();
  const user = session?.user as { id: string; name?: string; role?: string } | undefined;
  if (!user) redirect("/login");
  const first = (user.name ?? "").split(/\s+/)[0] || "there";
  const help = (who: string) => (
    <RailCard title="Need a hand?" aside={`Ask ${who}`}>
      <RailRows empty="" rows={user.role === "owner" ? [
        { key: "faq", title: "Help centre", sub: "Short guides for each step", icon: UserRound, tone: "neutral", href: "/admin/settings/faq" },
        { key: "support", title: "Support", sub: "Questions clients have asked", icon: Bell, tone: "neutral", href: "/admin/clients/support" },
      ] : [
        { key: "faq", title: "Help centre", sub: "Short guides for the team", icon: UserRound, tone: "neutral", href: "/admin/help" },
        { key: "ask", title: "Message Admin", sub: "The answer lands in Messages", icon: Bell, tone: "neutral", href: "/admin/help?ask=1" },
      ]} />
    </RailCard>
  );

  if (user.role === "owner") {
    await syncStore();
    persistSoon();
    await hydrateSettings();
    let team = 0;
    try {
      const r = await db.query<{ n: number }>(`SELECT ((SELECT count(*) FROM "user" WHERE "role"='staff')+(SELECT count(*) FROM invitations WHERE role<>'client'))::INT AS n`);
      team = r.rows[0]?.n ?? 0;
    } catch { team = 0; }
    let accounts = 0;
    try { accounts = (JSON.parse(getSetting("finance.accounts") ?? "[]") as unknown[]).length; } catch { accounts = 0; }
    const steps: WelcomeStep[] = [
      { key: "terms", icon: "percent", title: "Set VAT and payment terms", body: "How new invoices start and when unpaid ones are chased.", label: "Set terms", href: "/admin/settings/general", done: getSetting("finance.vatRate") !== null || getSetting("finance.dueInDays") !== null },
      { key: "pay", icon: "card", title: "Connect Paystack or Flutterwave", body: "Clients pay by card or bank transfer. We never hold the money.", label: "Connect", href: "/admin/settings/integrations", done: paystackConfig().ok },
      { key: "bank", icon: "banknote", title: "Add a bank account", body: "Shown on invoices and quotes for transfers.", label: "Add account", href: "/admin/settings/general", done: accounts > 0 },
      { key: "team", icon: "invite", title: "Invite your team", body: "Staff see their own projects and clients, never amounts.", label: "Invite", href: "/admin/users", done: team > 0 },
      { key: "client", icon: "people", title: "Add your first client", body: "One record and one portal per person.", label: "Add a client", href: "/admin/clients?new=1", done: getClients().length > 0 },
    ];
    return (
      <>
        <PageHead title={`Welcome, ${first}`} lede="A few quick steps and you are ready." action={<Link className="ad__btn" href="/admin">Skip for now</Link>} />
        <Workbench railLabel="Help" rail={help("a colleague")}>
          <WelcomeSteps id="admin" title="Set up the studio" blurb="Five steps. Clients, projects and money all start from what you add here." steps={steps}
            finish={<Link className="ad__btn" href="/admin">Go to Today</Link>} />
        </Workbench>
      </>
    );
  }

  if (user.role !== "staff") redirect("/admin");
  const mine = (await listDepartments())?.filter((d) => d.members.some((m) => m.id === user.id)) ?? [];
  const steps: WelcomeStep[] = [
    { key: "profile", icon: "person", title: "Check your profile", body: "Your name, a password and the devices you use.", label: "Check profile", href: "/admin/settings/account" },
    { key: "day", icon: "home", title: "Look at your dashboard", body: "Your tasks, meetings and what waits on you.", label: "Open dashboard", href: "/admin" },
    { key: "projects", icon: "projects", title: "Meet your projects", body: "The projects in your departments. No amounts, only chips.", label: "Open projects", href: "/admin/projects" },
    { key: "msg", icon: "msg", title: "Try Messages", body: "Replies, mentions and notes to the team, in one list.", label: "Open Messages", href: "/admin/messages" },
    { key: "notify", icon: "bell", title: "Choose what reaches you", body: "Tasks, mentions and approvals, by email or in the app.", label: "Choose", href: "/admin/notifications" },
  ];
  return (
    <>
      <PageHead title={`Welcome, ${first}`} lede={<>A few quick steps and you are ready. <strong>{mine.length ? `You are in ${mine.map((d) => d.name).join(", ")}.` : "You are not in a department yet. Admin can add you."}</strong></>}
        action={<Form action={finishStaffWelcome}><Hidden name="how" value="skip" /><Submit tone="plain">Skip for now</Submit></Form>} />
      <Workbench railLabel="Help" rail={help("Admin")}>
        <WelcomeSteps id={`staff-${user.id}`} title="Get ready for your first day" blurb="Five steps. Your dashboard, projects, messages and notifications are all in the menu."
          steps={steps} finish={<Form action={finishStaffWelcome}><Hidden name="how" value="done" /><Submit>Take me to the dashboard</Submit></Form>} />
      </Workbench>
    </>
  );
}
