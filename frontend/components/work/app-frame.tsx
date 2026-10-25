import Image from "next/image";
import type { AppShot } from "@/lib/work";

/**
 * A screen in the frame of the device it was captured on: a laptop, a tablet,
 * a phone, a desktop app window or a plain panel. Drawn in CSS and sized by
 * the box it sits in, so one frame serves the opening stage, the screen viewer
 * and the full-screen view. The tablet's screen takes the capture's own shape
 * rather than a stock ratio, which is what used to crop TraxStaff's sidebar.
 */
export function AppFrame({ s, alt, sizes, priority = false }: { s: AppShot; alt: string; sizes: string; priority?: boolean }) {
  const img = <Image src={s.src} alt={alt} width={s.w} height={s.h} sizes={sizes} quality={80} priority={priority} />;
  if (s.device === "laptop") {
    return (
      <div className="dv dv--lap">
        <div className="dv__lid"><span className="dv__cam" aria-hidden="true" /><div className="dv__scr">{img}</div></div>
        <div className="dv__base" aria-hidden="true"><span /></div>
      </div>
    );
  }
  if (s.device === "window") {
    return (
      <div className="dv dv--win">
        <div className="dv__bar" aria-hidden="true"><i /><i /><i /></div>
        <div className="dv__scr">{img}</div>
      </div>
    );
  }
  if (s.device === "panel") return <div className="dv dv--panel"><div className="dv__scr">{img}</div></div>;
  const land = s.device === "tablet" && s.w > s.h;
  return (
    <div className={`dv dv--${s.device}${land ? " dv--land" : ""}`}>
      <div className="dv__scr" style={s.device === "tablet" ? { aspectRatio: `${s.w} / ${s.h}` } : undefined}>{img}</div>
    </div>
  );
}
