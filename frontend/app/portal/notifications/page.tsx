import { PersonalInbox } from "@/components/workspace/personal-inbox";

export const metadata = { title: "Notifications" };

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <PersonalInbox base="/portal/notifications" sp={await searchParams} />;
}
