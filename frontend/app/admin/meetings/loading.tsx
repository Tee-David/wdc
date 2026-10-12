import { Skeleton, SkFilters, SkPanel, SkRows, SkSplit, SkTable } from "@/components/admin/skeleton";

/* Meetings: head, the deck, the list card, and the pulse rail beside them. */
export default function Loading() {
  return (
    <Skeleton title="Meetings" actions={2}>
      <SkSplit
        main={<><SkPanel head={false}><SkRows n={1} /></SkPanel><SkPanel head={false}><SkFilters selects={0} /><SkTable rows={4} cols={3} avatar={false} /></SkPanel></>}
        rail={<><SkPanel><SkRows n={2} /></SkPanel><SkPanel><SkRows n={3} /></SkPanel></>}
      />
    </Skeleton>
  );
}
