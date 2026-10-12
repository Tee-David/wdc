import { Skeleton, SkFilters, SkPanel, SkRows, SkSplit, SkTable } from "@/components/admin/skeleton";

/* Users: head, the deck, the accounts card and the pulse rail. */
export default function Loading() {
  return (
    <Skeleton title="Users" actions={2}>
      <SkSplit
        main={<><SkPanel head={false}><SkRows n={1} /></SkPanel><SkPanel head={false}><SkFilters selects={0} /><SkTable rows={5} cols={4} /></SkPanel></>}
        rail={<><SkPanel><SkRows n={3} /></SkPanel><SkPanel><SkRows n={2} /></SkPanel></>}
      />
    </Skeleton>
  );
}
