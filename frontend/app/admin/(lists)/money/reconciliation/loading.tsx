import { Skeleton, SkPanel, SkTable, SkTiles } from "@/components/admin/skeleton";

/* Reconciliation's skeleton, shaped like the page on a desktop and a phone. */
export default function Loading() {
  return (
    <Skeleton title="Reconciliation">
      <SkTiles n={3} />
      <SkPanel><SkTable rows={6} cols={4} avatar={false} /></SkPanel>
    </Skeleton>
  );
}
