import { Skeleton, SkCards, SkPanel, SkRows, SkSplit, SkTiles } from "@/components/admin/skeleton";

/* The portal overview's skeleton, shaped like the page on a desktop and a phone. */
export default function Loading() {
  return (
    <Skeleton title="Overview" actions={2}>
      <SkTiles n={4} />
      <SkSplit main={<><SkPanel><SkRows n={3} /></SkPanel><SkPanel><SkCards n={2} /></SkPanel></>} rail={<><SkPanel><SkRows n={3} /></SkPanel><SkPanel><SkRows n={3} /></SkPanel></>} />
    </Skeleton>
  );
}
