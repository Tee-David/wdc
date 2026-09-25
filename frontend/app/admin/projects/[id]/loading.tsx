import { Skeleton, SkPanel, SkRows, SkSplit, SkTiles } from "@/components/admin/skeleton";

/* One project: header and actions, the stage track, figures, then the work beside its details. */
export default function Loading() {
  return (
    <Skeleton title="the project" record actions={3}>
      <SkPanel head={false}><SkRows n={1} /></SkPanel>
      <SkTiles n={3} />
      <SkSplit main={<SkPanel><SkRows n={3} /></SkPanel>} rail={<SkPanel><SkRows n={3} /></SkPanel>} />
    </Skeleton>
  );
}
