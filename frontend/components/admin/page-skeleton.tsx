"use client";

import "./bones/registry";
import { Skeleton } from "boneyard-js/react";

export function AdminPageSkeleton({
  children,
  loading = false,
}: {
  children?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Skeleton
      name="admin-dashboard"
      loading={loading}
      select="viewport"
      animate="pulse"
      transition={180}
      className="ad__pageSkeleton"
      boneClass="ad__bone"
      fallback={loading ? <DashboardLoadingFallback /> : undefined}
      snapshotConfig={{
        excludeSelectors: ["button", "svg", ".ad__demo", ".ad__emptyIcon"],
        excludeTags: ["nav"],
      }}
    >
      {children}
    </Skeleton>
  );
}

/** A resilient first-build fallback; generated bones replace it after capture. */
function DashboardLoadingFallback() {
  return (
    <div className="ad__loading" aria-hidden="true">
      <div className="ad__loadingHead">
        <span className="ad__loadingLine ad__loadingLine--title" />
        <span className="ad__loadingLine ad__loadingLine--copy" />
      </div>
      <div className="ad__loadingTiles">
        {Array.from({ length: 6 }, (_, index) => (
          <span className="ad__loadingTile" key={index} />
        ))}
      </div>
      <div className="ad__loadingGrid">
        <span className="ad__loadingPanel ad__loadingPanel--wide" />
        <span className="ad__loadingPanel" />
        <span className="ad__loadingPanel ad__loadingPanel--wide" />
        <span className="ad__loadingPanel" />
      </div>
    </div>
  );
}
