import AreaGate from "@/components/admin/owner-only";

/* Invoices, payments, expenses and estimates: owner only (lib/admin/permissions.ts). */
export default function MoneyLayout({ children }: { children: React.ReactNode }) {
  return <AreaGate area="money" what="Money">{children}</AreaGate>;
}
