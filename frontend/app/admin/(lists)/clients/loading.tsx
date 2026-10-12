import { Skeleton, SkPanel, SkRows, SkSplit, SkTable, SkTiles } from "@/components/admin/skeleton";

/* Clients, as it will land: the deck as one hero block, the list card with its
   rows at their real height, and the rail's four figure tiles and cards. */
export default function Loading() {
  return (
    <Skeleton title="Clients" actions={2}>
      <SkSplit
        main={<>
          <SkPanel head={false}><SkRows n={3} /></SkPanel>
          <SkPanel><SkTable rows={5} cols={5} /></SkPanel>
        </>}
        rail={<>
          <SkTiles n={4} />
          <SkPanel><SkRows n={4} /></SkPanel>
          <SkPanel><SkRows n={3} /></SkPanel>
        </>}
      />
    </Skeleton>
  );
}
