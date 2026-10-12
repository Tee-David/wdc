import { Skeleton, SkPanel, SkTable } from "@/components/admin/skeleton";

/* The form and the document beside it. */
export default function Loading() {
  return (
    <Skeleton title="the builder" record actions={1}>
      <SkPanel><SkTable rows={5} cols={3} avatar={false} /></SkPanel>
    </Skeleton>
  );
}
