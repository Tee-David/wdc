"use client";

import "./bones/registry";
import { Skeleton } from "boneyard-js/react";

const snapshotConfig = {
  excludeSelectors: ["button", "svg", ".ad__demo", ".ad__emptyIcon"],
  excludeTags: ["nav"],
};

export function AdminPageSkeleton({
  children,
  loading = false,
  capture = false,
}: {
  children?: React.ReactNode;
  loading?: boolean;
  capture?: boolean;
}) {
  // The CLI sets its build flag only in the browser. Rendering this same
  // capture shape on the server prevents React IDs from shifting at hydration.
  if (capture) {
    return (
      <div
        className="ad__pageSkeleton"
        data-boneyard="admin-dashboard"
        data-boneyard-config={JSON.stringify(snapshotConfig)}
        style={{ position: "relative" }}
      >
        <div>{children}</div>
      </div>
    );
  }

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
      snapshotConfig={snapshotConfig}
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
