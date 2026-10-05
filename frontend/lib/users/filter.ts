export type UserFilter = { tab: "team" | "clients" | "invitations"; search: string; role: string; status: string; page: number; size: number };
export function userFilter(raw: Record<string, string | string[] | undefined>): UserFilter {
  const text = (key: string) => typeof raw[key] === "string" ? String(raw[key]) : "";
  return { tab: ["clients", "invitations"].includes(text("tab")) ? text("tab") as UserFilter["tab"] : "team", search: text("q").trim().slice(0, 120), role: ["owner", "staff", "client"].includes(text("role")) ? text("role") : "", status: ["active", "deactivated", "pending", "expired", "redeemed", "revoked"].includes(text("status")) ? text("status") : "", page: Math.max(1, Math.min(100000, Number.parseInt(text("page")) || 1)), size: [10, 25, 50, 100].includes(Number(text("size"))) ? Number(text("size")) : 25 };
}

