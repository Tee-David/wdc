"use client";

import { usePathname } from "next/navigation";
import ReactDOM from "react-dom";
import SmoothScrollLoader from "@/components/ui/smooth-scroll-loader";
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

  if (path.startsWith("/admin") || ["/login", "/forgot-password", "/reset-password"].includes(path)) return null;

  /* OPEN THE SOCKETS THE CHAT IS ABOUT TO NEED, WITHOUT TOUCHING THE CHAT.
     Lighthouse reported no preconnected origins at all, so the embed pays
     DNS, TCP and TLS in series on three separate hosts after the document has
     already parsed: `cdn.jotfor.ms` for the loader, `www.jotform.com` for the
     runtime it appends, and `files.jotform.com` for the avatar. Warming them
     changes nothing about how or when the widget loads; it only removes the
     handshake from the critical path.

     NO `crossOrigin` ON PURPOSE. A preconnect is keyed on the connection's
     credentials mode, so hinting an anonymous connection for a script that is
     fetched WITHOUT `crossorigin` opens a second socket nobody uses and
     leaves the real one cold. None of these three requests are CORS
     requests. Done here rather than in `jotform-agent.tsx` because that file
     is the owner's to decide about; this is our own chrome. */
  ReactDOM.preconnect("https://cdn.jotfor.ms");
  ReactDOM.preconnect("https://www.jotform.com");
  ReactDOM.preconnect("https://files.jotform.com");

  return (
    <>
      <SmoothScrollLoader />
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
