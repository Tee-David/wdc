import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { getAdminRequest } from "@/lib/admin/session";
import { getSetting } from "@/lib/admin/store";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { mailIsConfigured } from "@/lib/email";
import { DEFAULT_LOG_RETENTION, getAppSetting, LOG_RETENTION_DAYS, LOG_RETENTION_KEY } from "@/lib/app-settings";
import { AdminState } from "@/components/admin/admin-state";
import { Panel } from "@/components/admin/bits";
import { TestEmail } from "@/components/admin/email-settings";
import { Head } from "@/components/admin/settings/kit";
import { EmailForm } from "@/components/admin/settings/email-form";
import "@/components/admin/forms/forms.css";

export const metadata = { title: "Email" };

/**
 * What a client sees in their inbox. The sender name and reply-to are
 * settings (lib/email.ts reads them on every send); the mail server itself is
 * READ, NEVER WRITTEN: its details are environment variables set in the
 * hosting, so the password never passes through the admin. The log is its own
 * page, /admin/settings/email/log.
 */
function connection() {
  const env = (k: string) => process.env[k]?.trim() ?? "";
  const port = env("SMTP_PORT") || "465";
  return [
    { label: "Server", value: env("SMTP_HOST") || null },
    { label: "Port", value: port },
    { label: "Encryption", value: env("SMTP_SECURE") === "true" || port === "465" ? "SSL/TLS on connect" : "STARTTLS when offered" },
    { label: "Username", value: env("SMTP_USER") || null },
    { label: "Password", value: env("SMTP_PASSWORD") ? "Set, not shown" : null },
    { label: "From address", value: env("SMTP_FROM_EMAIL") || null },
  ];
}

export default async function EmailSettingsPage() {
  await syncStore();
  persistSoon();
  if (!can(await adminRole(), "settings")) {
    return (
      <section className="ad__panel">
        <AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="Email settings are for the owner" description="The sender, the message log and retention are changed by the owner." />
      </section>
    );
  }
  const { session } = await getAdminRequest().catch(() => ({ session: null }));
  const days = await getAppSetting(LOG_RETENTION_KEY, DEFAULT_LOG_RETENTION);
  const ok = mailIsConfigured();
  const shippedReply = process.env.SMTP_REPLY_TO?.trim() || "";
  return (
    <>
      <Head title="Email" line="What clients see in their inbox.">
        <Link className="ad__btn" href="/admin/settings/email/log">Message log <ArrowUpRight aria-hidden="true" /></Link>
      </Head>
      <div className="ad__stack">
        <Panel title="Mail server" action={<span className={`ad__pill ${ok ? "ad__pill--good" : "ad__pill--bad"}`}>{ok ? "Set up" : "Missing"}</span>}>
          <div className="adSetPad">
            <TestEmail me={session?.user?.email ?? ""} />
            <details className="adSet__more">
              <summary>Connection details</summary>
              <dl className="adForms__dl">
                {connection().map((c) => (
                  <div key={c.label}><dt>{c.label}</dt><dd>{c.value ?? <span className="ad__pill ad__pill--bad">Missing</span>}</dd></div>
                ))}
              </dl>
              <p className="ad__dim adForms__p">Set in the hosting environment, never here.</p>
            </details>
          </div>
        </Panel>
        <EmailForm fromName={getSetting("mail.fromName") || process.env.SMTP_FROM_NAME?.trim() || "WDC Solutions"}
          replyTo={getSetting("mail.replyTo") || ""} shippedReplyTo={shippedReply} days={days} options={LOG_RETENTION_DAYS} />
      </div>
    </>
  );
}
