import { PersonalInbox } from '@/components/workspace/personal-inbox';
import PageTourButton from '@/components/admin/tour/page-tour-button';
export const metadata={title:'Your inbox'};
export default function InboxPage(){return <><div className="ad__head" data-tour="workspace-inbox"><div><h1>Your inbox</h1><p>Reviews, deadlines and project updates addressed to you.</p></div><PageTourButton/></div><PersonalInbox/></>;}
