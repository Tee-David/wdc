import { Skeleton, SkPanel, SkTable, SkTiles } from "@/components/admin/skeleton";

/* Billing's skeleton, shaped like the page on a desktop and a phone. */
export default function Loading() {
  return (
    <Skeleton title="Billing">
      <SkTiles n={3} />
      <SkPanel><SkTable rows={5} cols={3} avatar={false} /></SkPanel>
    </Skeleton>
  );
}
