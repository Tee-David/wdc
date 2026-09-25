import { Skeleton, SkCards, SkPanel, SkRows, SkSplit } from "@/components/admin/skeleton";

/* One of the client's projects: its stages, what is waiting on them, then the details. */
export default function Loading() {
  return (
    <Skeleton title="your project" record actions={1}>
      <SkPanel head={false}><SkRows n={1} /></SkPanel>
      <SkSplit main={<SkPanel><SkCards n={1} /></SkPanel>} rail={<SkPanel><SkRows n={3} /></SkPanel>} />
    </Skeleton>
  );
}
