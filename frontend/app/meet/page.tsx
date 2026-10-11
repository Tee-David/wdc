import type { Metadata } from "next";
import { BarePage } from "@/components/layout/bare-page";
import { BookingForm } from "@/components/meetings/booking";
import { SITE_URL } from "@/lib/site";
import "@/components/admin/admin.css";

export const metadata: Metadata = { title: "Schedule a meeting", description: "Choose a time to discuss your project with We Dig Creativity.", alternates: { canonical: `${SITE_URL}/meet` } };

/* A bare page, like the other places a person arrives from an email or a link:
   the booking card on the dashboard's ground, no marketing header. */
export default function MeetPage() {
  return <BarePage><BookingForm /></BarePage>;
}
