import { notFound } from "next/navigation";

/* A mistyped /admin/... address: without this it falls through to the public
   site's 404 and leaves the dashboard. Routed here, it gets the admin's own
   not-found page inside the shell. Specific routes always win over this. */
export default function AdminUnknown() {
  notFound();
}
