import { Skeleton, SkForm, SkPanel, SkRows } from "@/components/admin/skeleton";

/* One question: its header, the conversation, then the reply box. */
export default function Loading() {
  return (
    <Skeleton title="the question" record actions={2}>
      <SkPanel><SkRows n={2} /><SkForm fields={1} /></SkPanel>
    </Skeleton>
  );
}
