import { Skeleton, SkFilters, SkPanel, SkTable, SkTiles } from "@/components/admin/skeleton";

/* Clients's skeleton, shaped like the page on a desktop and a phone. */
export default function Loading() {
  return (
    <Skeleton title="Clients" actions={2}>
      <SkTiles n={4} />
      <SkPanel><SkFilters selects={2} /><SkTable rows={8} cols={4} /></SkPanel>
    </Skeleton>
  );
}
