import { Skeleton, SkFilters, SkPanel, SkTable, SkTiles } from "@/components/admin/skeleton";

/* Projects: head, three figures, then the card with the view switch, chips and the list. */
export default function Loading() {
  return (
    <Skeleton title="Projects" actions={2}>
      <SkTiles n={3} />
      <SkPanel head={false}>
        <SkFilters selects={0} />
        <SkTable rows={5} cols={5} />
      </SkPanel>
    </Skeleton>
  );
}
