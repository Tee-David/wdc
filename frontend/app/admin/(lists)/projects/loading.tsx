import { Skeleton, SkBoard } from "@/components/admin/skeleton";

/* Projects's skeleton, shaped like the page on a desktop and a phone. */
export default function Loading() {
  return (
    <Skeleton title="Projects" actions={2}>
      <SkBoard />
    </Skeleton>
  );
}
