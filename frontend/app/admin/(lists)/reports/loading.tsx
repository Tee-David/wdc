import { Skeleton, SkChart, SkPanel, SkRows, SkSplit, SkTable, SkTiles } from "@/components/admin/skeleton";

/* Reports: the bar, the tabs, the figures, a chart and two lists, in the order the page draws them. */
export default function Loading() {
  return (
    <Skeleton title="Reports" actions={2}>
      <SkPanel><SkRows n={2} /></SkPanel>
      <SkTiles n={4} />
      <SkSplit main={<SkPanel><SkChart /></SkPanel>} rail={<SkPanel><SkRows n={4} /></SkPanel>} />
      <SkPanel><SkTable rows={4} cols={5} /></SkPanel>
    </Skeleton>
  );
}
