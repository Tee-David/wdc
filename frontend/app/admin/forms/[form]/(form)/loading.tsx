import { Skeleton, SkFilters, SkPanel, SkTable } from "@/components/admin/skeleton";

/* One form's entries: the form's name, the filters, the table. */
export default function Loading() {
  return (
    <Skeleton title="the form" record actions={1}>
      <SkPanel><SkFilters selects={1} /><SkTable rows={6} cols={4} /></SkPanel>
    </Skeleton>
  );
}
