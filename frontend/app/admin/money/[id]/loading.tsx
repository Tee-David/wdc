import { Skeleton, SkPanel, SkTable, SkTiles } from "@/components/admin/skeleton";

/* One invoice: number and actions, total, paid, owed and due, then its lines. */
export default function Loading() {
  return (
    <Skeleton title="the invoice" record actions={3}>
      <SkTiles n={4} />
      <SkPanel><SkTable rows={4} cols={4} avatar={false} /></SkPanel>
    </Skeleton>
  );
}
