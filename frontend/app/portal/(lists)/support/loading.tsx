import { Skeleton, SkFilters, SkPanel, SkRows, SkSplit, SkTable } from "@/components/admin/skeleton";

/* Messages: head, the conversations card and the "talk to us" rail. */
export default function Loading() {
  return (
    <Skeleton title="Messages" actions={1}>
      <SkSplit main={<SkPanel head={false}><SkFilters selects={0} /><SkTable rows={4} cols={2} avatar={false} /></SkPanel>} rail={<SkPanel><SkRows n={3} /></SkPanel>} />
    </Skeleton>
  );
}
