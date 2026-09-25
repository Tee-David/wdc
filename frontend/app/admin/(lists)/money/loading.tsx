import { Skeleton, SkChart, SkFilters, SkPanel, SkRows, SkSplit, SkTable, SkTiles } from "@/components/admin/skeleton";

/* Money's skeleton, shaped like the page on a desktop and a phone. */
export default function Loading() {
  return (
    <Skeleton title="Money" actions={3}>
      <SkTiles n={5} />
      <SkSplit main={<SkPanel><SkChart /></SkPanel>} rail={<SkPanel><SkRows n={3} /></SkPanel>} />
      <SkPanel><SkFilters selects={2} /><SkTable rows={6} cols={5} /></SkPanel>
    </Skeleton>
  );
}
