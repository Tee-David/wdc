import { notFound } from "next/navigation";

/* A mistyped /portal/... address: without this it falls through to the public
   site's 404 and leaves the portal. Routed here, it gets the portal's own
   not-found page inside the shell. Specific routes always win over this. */
export default function PortalUnknown() {
  notFound();
}
