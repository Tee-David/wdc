import { Download } from "lucide-react";

/** Every list's Export: the same button, with its icon, everywhere (calendar and contacts already match). */
export function ExportLink({ href, label = "Export" }: { href: string; label?: string }) {
  return <a className="ad__btn ad__export" href={href}><Download aria-hidden="true" />{label}</a>;
}
