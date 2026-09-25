import { Skeleton, SkChart, SkPanel, SkRows, SkSplit, SkTable, SkTiles } from "@/components/admin/skeleton";

/* The dashboard's skeleton, shaped like the page on a desktop and a phone. */
export default function Loading() {
  return (
    <Skeleton title="Dashboard" actions={2}>
      <SkTiles n={4} />
      <SkSplit main={<SkPanel><SkChart /></SkPanel>} rail={<SkPanel><SkRows n={2} /></SkPanel>} />
      <SkSplit main={<SkPanel><SkRows n={3} /></SkPanel>} rail={<SkPanel><SkRows n={3} /></SkPanel>} />
      <SkPanel><SkTable rows={4} cols={4} /></SkPanel>
    </Skeleton>
  );
}
