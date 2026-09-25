import { adminRole } from "@/lib/admin/guard";
import { SettingsNav } from "@/components/admin/settings/settings-nav";
import "@/components/admin/settings/settings.css";

/** Every Settings page sits beside the list of sections. */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const role = await adminRole();
  return (
    <div className="adSet">
      <SettingsNav role={role} />
      <div className="adSet__main">{children}</div>
    </div>
  );
}
