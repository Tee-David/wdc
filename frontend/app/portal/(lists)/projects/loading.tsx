import { Skeleton, SkCards, SkPanel } from "@/components/admin/skeleton";

/* Your projects's skeleton, shaped like the page on a desktop and a phone. */
export default function Loading() {
  return (
    <Skeleton title="Your projects">
      <SkPanel><SkCards n={2} /></SkPanel>
    </Skeleton>
  );
}
