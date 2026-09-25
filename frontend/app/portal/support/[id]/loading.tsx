import { Skeleton, SkForm, SkPanel, SkRows, SkSplit } from "@/components/admin/skeleton";

/* One conversation: the messages and the reply box, beside what it is about. */
export default function Loading() {
  return (
    <Skeleton title="the conversation" record lede={false}>
      <SkSplit main={<SkPanel><SkRows n={2} /><SkForm fields={1} /></SkPanel>} rail={<SkPanel><SkRows n={3} /></SkPanel>} />
    </Skeleton>
  );
}
