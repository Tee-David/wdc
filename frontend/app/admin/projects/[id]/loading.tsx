import { Skeleton, SkPanel, SkRows, SkSplit } from "@/components/admin/skeleton";

/* One project: header and actions, the stage card, then the overview's two lists beside the rail. */
export default function Loading() {
  return (
    <Skeleton title="the project" record actions={2}>
      <SkPanel head={false}><SkRows n={1} /></SkPanel>
      <SkSplit main={<><SkPanel><SkRows n={2} /></SkPanel><SkPanel><SkRows n={3} /></SkPanel></>} rail={<><SkPanel><SkRows n={3} /></SkPanel><SkPanel><SkRows n={2} /></SkPanel></>} />
    </Skeleton>
  );
}
