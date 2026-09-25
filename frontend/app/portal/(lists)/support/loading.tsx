import { Skeleton, SkPanel, SkTable } from "@/components/admin/skeleton";

/* Support's skeleton, shaped like the page on a desktop and a phone. */
export default function Loading() {
  return (
    <Skeleton title="Support" actions={1}>
      <SkPanel><SkTable rows={4} cols={2} avatar={false} /></SkPanel>
    </Skeleton>
  );
}
