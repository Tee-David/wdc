import { Skeleton, SkPanel, SkTable, SkTiles } from "@/components/admin/skeleton";

/* Forms's skeleton, shaped like the page on a desktop and a phone. */
export default function Loading() {
  return (
    <Skeleton title="Forms" actions={2}>
      <SkTiles n={4} />
      <SkPanel><SkTable rows={6} cols={4} /></SkPanel>
      <SkPanel><SkTable rows={2} cols={3} /></SkPanel>
    </Skeleton>
  );
}
