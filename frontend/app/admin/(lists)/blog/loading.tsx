import { Skeleton, SkFilters, SkPanel, SkTable, SkTiles } from "@/components/admin/skeleton";

/* The blog's skeleton, shaped like the page on a desktop and a phone. */
export default function Loading() {
  return (
    <Skeleton title="Blog" actions={2}>
      <SkTiles n={4} />
      <SkPanel><SkFilters selects={2} /><SkTable rows={6} cols={4} avatar={false} /></SkPanel>
    </Skeleton>
  );
}
