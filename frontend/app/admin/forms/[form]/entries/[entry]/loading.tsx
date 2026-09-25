import { Skeleton, SkForm, SkPanel, SkRows, SkSplit } from "@/components/admin/skeleton";

/* One entry: the answers beside what has been done with it. */
export default function Loading() {
  return (
    <Skeleton title="the entry" record actions={2}>
      <SkSplit main={<SkPanel><SkForm fields={6} /></SkPanel>} rail={<SkPanel><SkRows n={3} /></SkPanel>} />
    </Skeleton>
  );
}
