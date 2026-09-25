import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import PageTourButton from "@/components/admin/tour/page-tour-button";

export const metadata = { title: "Settings" };

/**
 * Settings, as a list of sections (the layout draws it: beside this on a wide
 * screen, as the page itself on a phone). Staff see the two they can use.
 */
export default async function SettingsPage() {
  const owner = can(await adminRole(), "settings");
  return (
    <div className="ad__head">
      <div>
        <h1>Settings</h1>
        <p>{owner
          ? "Content on the public site, the studio's defaults, email, and how the admin runs. Pick a section."
          : "The FAQ and the media library are yours to edit. Everything else here is the owner's."}</p>
      </div>
      <div className="ad__row"><PageTourButton /></div>
    </div>
  );
}
