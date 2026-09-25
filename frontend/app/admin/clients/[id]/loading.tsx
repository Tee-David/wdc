import { Skeleton, SkPanel, SkRows, SkSplit, SkTable, SkTiles } from "@/components/admin/skeleton";

/* One client, shaped like the page: header and actions, four figures, then projects beside portal access. */
export default function Loading() {
  return (
    <Skeleton title="the client" record actions={3}>
      <SkTiles n={4} />
      <SkSplit main={<SkPanel><SkTable rows={3} cols={4} avatar={false} /></SkPanel>} rail={<SkPanel><SkRows n={2} /></SkPanel>} />
    </Skeleton>
  );
}
