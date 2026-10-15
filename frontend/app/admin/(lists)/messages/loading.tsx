import { Skeleton, SkPanel, SkRows } from "@/components/admin/skeleton";
import "@/components/admin/messages.css";

/* Messages loading: the list beside the thread, as the page lays them out
   (one pane on a phone, the list). */
export default function Loading() {
  return (
    <Skeleton title="Messages" actions={1}>
      <div className="adMxBox">
        <div className="adMx is-list">
          <SkPanel className="adMx__list"><SkRows n={5} /></SkPanel>
          <SkPanel className="adMx__thread"><SkRows n={3} /></SkPanel>
        </div>
      </div>
    </Skeleton>
  );
}
