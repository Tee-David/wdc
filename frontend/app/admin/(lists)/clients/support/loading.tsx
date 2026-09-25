import { Skeleton, SkFilters, SkPanel, SkTable, SkTiles } from "@/components/admin/skeleton";

/* Support's skeleton, shaped like the page on a desktop and a phone. */
export default function Loading() {
  return (
    <Skeleton title="Support">
      <SkTiles n={3} />
      <SkPanel><SkFilters selects={1} /><SkTable rows={6} cols={4} avatar={false} /></SkPanel>
    </Skeleton>
  );
}
