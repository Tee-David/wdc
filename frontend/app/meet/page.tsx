import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { WorkFooter } from "@/components/work/work-footer";
import { BookingForm } from "@/components/meetings/booking";
import { SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/admin/admin.css";

export const metadata: Metadata={title:"Schedule a meeting",description:"Choose a time to discuss your project with We Dig Creativity.",alternates:{canonical:`${SITE_URL}/meet`}};
export default function MeetPage(){return <><Header overHero/><main id="main" className="pv" tabIndex={-1}><section className="wk-hero"><div className="pv-wrap wk-hero__in"><span className="pv-eyebrow">Let’s talk</span><h1 className="pv-mix">Make time for <b>your next idea</b></h1><p className="pv-lede">Choose a convenient time for a project conversation. You can also send an enquiry whenever that suits you better.</p></div></section><section className="pv-sec"><div className="pv-wrap"><BookingForm/></div></section></main><WorkFooter/></>}
