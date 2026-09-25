import { Skeleton, SkForm, SkPanel } from "@/components/admin/skeleton";

/* Settings's skeleton, shaped like the page on a desktop and a phone. */
export default function Loading() {
  return (
    <Skeleton title="Settings">
      <SkPanel><SkForm fields={4} /></SkPanel>
    </Skeleton>
  );
}
