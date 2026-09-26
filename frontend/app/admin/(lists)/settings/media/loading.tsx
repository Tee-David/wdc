import { Skeleton, SkFilters, SkPanel } from "@/components/admin/skeleton";
import "@/components/admin/media-library.css";

/* The library's skeleton: its head with the Upload button, the tabs and the
   filters, then a grid of cards at the real card size, so nothing moves when
   the files arrive. */
export default function Loading() {
  return (
    <Skeleton title="Media library" actions={1}>
      <SkPanel head={false}>
        <SkFilters selects={2} />
        <ul className="adMedia__grid" style={{ paddingTop: ".5rem" }}>
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="adMedia__card" style={{ cursor: "default" }}>
              <span className="adMedia__thumb"><span className="sk__b" style={{ position: "absolute", inset: 0, borderRadius: 0 }} /></span>
              <span className="adMedia__cardBody">
                <span className="sk__b" style={{ height: ".9rem", width: "70%" }} />
                <span className="sk__b" style={{ height: ".7rem", width: "55%" }} />
              </span>
            </li>
          ))}
        </ul>
      </SkPanel>
    </Skeleton>
  );
}
