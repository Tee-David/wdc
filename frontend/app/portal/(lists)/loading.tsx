/* The portal's list skeleton, in a route group for the same reason as the
   admin's: see app/admin/(lists)/loading.tsx. Above the `[id]` pages it made
   a missing project or support thread answer 200. */
export default function PortalLoading() {
  return (
    <div className="ad__loading">
      <div className="ad__loadingHead">
        <span className="ad__loadingLine ad__loadingLine--title" />
        <span className="ad__loadingLine ad__loadingLine--copy" />
      </div>
      <div className="ad__loadingTiles">
        <span className="ad__loadingTile" />
        <span className="ad__loadingTile" />
        <span className="ad__loadingTile" />
      </div>
      <div className="ad__loadingGrid">
        <span className="ad__loadingPanel" />
        <span className="ad__loadingPanel" />
      </div>
    </div>
  );
}
