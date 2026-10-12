import { SERVICES, type Service } from "@/lib/services";
import { getClient, getDeliverablesFor, getInvoices, getProjects, getTasks } from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, projectAttention, STAGES, type Attention, type Client, type Invoice, type Project, type Task } from "@/lib/admin/types";
import { studioDay } from "@/components/admin/calendar/studio-time";

/**
 * EVERYTHING THE PROJECT LIST, BOARD, TIMELINE AND CALENDAR SAY ABOUT A PROJECT,
 * derived from the store in one place so the four views cannot disagree. Nothing
 * here is stored: the stage progress is the stage's place among the stages, the
 * counts are the tasks and deliverables on file, the payment chip is read from
 * the invoices raised against the project.
 */
export type ProjectState = "live" | "waiting" | "done";

export type PaymentChip = { text: string; tone: "good" | "warn" | "bad" | "flat" | "brand"; invoiced?: number; paidShare?: number; next?: string };

export type ProjectRow = {
  project: Project;
  client: Client | undefined;
  service: Service | undefined;
  state: ProjectState;
  stageIndex: number;
  /** 0 to 1: its place among the stages, so the first stage still shows a sliver and Delivered is full. */
  progress: number;
  tasksDone: number;
  tasksTotal: number;
  files: number;
  waitingOnClient: number;
  attention: Attention[];
  payment: PaymentChip;
  /** Studio day of its due date, or "" when none. */
  due: string;
  /** When it started: its first recorded event, or "". */
  started: string;
};

export function stateOf(p: Project): ProjectState {
  return p.stage === "Delivered" ? "done" : p.health === "Waiting on client" ? "waiting" : "live";
}

function paymentFor(invoices: Invoice[], money: boolean): PaymentChip {
  const real = invoices.filter((i) => !i.voided && i.status !== "Draft");
  if (!real.length) return { text: "Not billed", tone: "flat" };
  const total = real.reduce((n, i) => n + invoiceTotals(i).total, 0);
  const paid = real.reduce((n, i) => n + Math.min(i.paid, invoiceTotals(i).total), 0);
  const overdue = real.some((i) => invoiceStatus(i) === "Overdue");
  const share = total ? Math.round((paid / total) * 100) : 0;
  const chip: PaymentChip = paid >= total ? { text: "Paid", tone: "good" }
    : overdue ? { text: "Overdue", tone: "bad" }
    : paid > 0 ? { text: "Part paid", tone: "warn" }
    : { text: "Awaiting payment", tone: "warn" };
  /* Staff get the chip and never an amount. */
  return money ? { ...chip, invoiced: total, paidShare: share } : chip;
}

export function buildProjectRows({ money }: { money: boolean }): ProjectRow[] {
  const tasks = getTasks();
  const invoices = getInvoices();
  return getProjects().map((project) => {
    const t = tasks.filter((x: Task) => x.projectId === project.id);
    const stageIndex = STAGES.indexOf(project.stage);
    const deliverables = getDeliverablesFor(project.id);
    return {
      project,
      client: getClient(project.clientId) ?? undefined,
      service: SERVICES.find((s) => s.slug === project.service),
      state: stateOf(project),
      stageIndex,
      progress: (stageIndex + 1) / STAGES.length,
      tasksDone: t.filter((x) => x.done).length,
      tasksTotal: t.length,
      files: deliverables.length,
      waitingOnClient: deliverables.filter((d) => d.approval === "Awaiting client").length,
      attention: projectAttention(project, tasks),
      payment: paymentFor(invoices.filter((i) => i.projectId === project.id), money),
      due: project.due ? studioDay(project.due) : "",
      started: project.events[0]?.at ? studioDay(project.events[0].at) : "",
    };
  });
}
