import { Skeleton, SkFilters, SkPanel, SkRows, SkSplit, SkTable } from "@/components/admin/skeleton";

/* Notifications: head, the deck, the inbox card and the pulse rail. */
export default function Loading() {
  return (
    <Skeleton title="Notifications" actions={2}>
      <SkSplit
        main={<><SkPanel head={false}><SkRows n={1} /></SkPanel><SkPanel head={false}><SkFilters selects={0} /><SkTable rows={5} cols={3} avatar={false} /></SkPanel></>}
        rail={<><SkPanel><SkRows n={2} /></SkPanel><SkPanel><SkRows n={4} /></SkPanel></>}
      />
    </Skeleton>
  );
}
