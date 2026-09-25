import { Skeleton, SkForm, SkPanel, SkRows, SkSplit } from "@/components/admin/skeleton";

/* The post editor: the writing beside the publish panel. */
export default function Loading() {
  return (
    <Skeleton title="the post" record>
      <SkSplit main={<SkPanel head={false}><SkForm fields={5} /></SkPanel>} rail={<SkPanel><SkRows n={3} /></SkPanel>} />
    </Skeleton>
  );
}
