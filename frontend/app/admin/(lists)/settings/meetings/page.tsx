import AreaGate from "@/components/admin/owner-only";
import { MeetingSettings } from "@/components/meetings/settings";

export const metadata = { title: "Meetings" };

/** Owner only. Staff see the no-access panel (with a way back), not a silent redirect. */
export default function SchedulingPage() {
  return (
    <AreaGate area="settings" what="Scheduling settings">
      <MeetingSettings />
    </AreaGate>
  );
}
