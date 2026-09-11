"use client";

import { usePathname } from "next/navigation";
import { SmoothScroll } from "@/components/ui/smooth-scroll";
import SmoothCursorLoader from "@/components/ui/smooth-cursor-loader";
import JotformAgent from "@/components/agent/jotform-agent";
import UserWay from "@/components/ui/userway";

/**
 * Everything the public site wears and the admin does not.
 *
 * WHY IT IS ONE COMPONENT RATHER THAN FOUR CONDITIONS. The admin route group
 * nests inside the root layout, so it cannot unmount what the root layout
 * mounted; the decision has to be made above it, and making it once in one
 * place is the difference between a rule and four copies of a rule that drift.
 *
 * WHAT IS DELIBERATELY NOT HERE, because it belongs everywhere: the
 * connectivity bar, which matters MORE on the admin than on the site, and
 * back-to-top, which a long table wants as much as a long page does.
 *
 * The preloader and the intro are decided even earlier, in the pre-paint
 * script in app/layout.tsx. By the time a component could read the router the
 * cover is already painted, so the path test happens there instead.
 */
export default function SiteChrome() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;

  return (
    <>
      <SmoothScroll />
      {/* Renders nothing on touch or under reduced motion -- see the
          component. */}
      <SmoothCursorLoader />
      {/* The official embed owns its native bottom-right launcher; there is
          intentionally no replacement FAB or styling shim around it. */}
      <JotformAgent />
      {/* Bottom left on desktop, on the same baseline as back-to-top. */}
      <UserWay className="uw--corner" />
    </>
  );
}
