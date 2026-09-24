import { AdminPageSkeleton } from "@/components/admin/page-skeleton";

/**
 * The skeleton for the LIST pages, and only those.
 *
 * WHY IT IS IN A ROUTE GROUP. A loading boundary makes Next stream the shell
 * with a 200 before the page body runs, so a `notFound()` called in a page
 * underneath it renders the not-found screen and still answers 200. This file
 * used to sit at the segment root, above every `[id]` page, which is exactly
 * why a missing client, project, invoice or form answered 200 on all four
 * detail routes: measured by moving this file away, after which they answered
 * 404 and the existing ones stayed 200. The `(lists)` group changes no URL; it
 * only keeps the detail routes outside the boundary. They lose the instant
 * skeleton on navigation, which is the price of a truthful status.
 */
export default function AdminLoading() {
  return <AdminPageSkeleton loading />;
}
