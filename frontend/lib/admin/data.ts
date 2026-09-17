import * as memory from "./store";

/**
 * THE ADMIN'S DATA, BEHIND ONE ASYNC DOOR.
 *
 * Every admin page, action, route and portal screen reads and writes through
 * here, never through `./store` directly. Today each function forwards to the
 * in-memory store, so nothing behaves differently; the point is the shape.
 * A table cannot answer synchronously, and making every caller `await` now,
 * in one change, means moving a domain to CockroachDB later is a change to
 * this file and a repository module, not another sweep through thirty pages.
 *
 * The switch to the database is deliberately all-or-nothing per deployment
 * rather than per domain: the store's invoices, projects and payments point at
 * its own seeded clients, so a half-moved admin would join real rows to
 * fictional ones. See plans/admin-db-plan.md.
 *
 * GENERATED from store.ts's exports; keep it in step when the store grows.
 */

export type { AgingBucket, ClientDraft, ApplyResult, QueueResult } from "./store";

export const getClients = async (...a: Parameters<typeof memory.getClients>): Promise<ReturnType<typeof memory.getClients>> => memory.getClients(...a);
export const getClient = async (...a: Parameters<typeof memory.getClient>): Promise<ReturnType<typeof memory.getClient>> => memory.getClient(...a);
export const getProjects = async (...a: Parameters<typeof memory.getProjects>): Promise<ReturnType<typeof memory.getProjects>> => memory.getProjects(...a);
export const getProjectsFor = async (...a: Parameters<typeof memory.getProjectsFor>): Promise<ReturnType<typeof memory.getProjectsFor>> => memory.getProjectsFor(...a);
export const getProject = async (...a: Parameters<typeof memory.getProject>): Promise<ReturnType<typeof memory.getProject>> => memory.getProject(...a);
export const getInvoices = async (...a: Parameters<typeof memory.getInvoices>): Promise<ReturnType<typeof memory.getInvoices>> => memory.getInvoices(...a);
export const getInvoice = async (...a: Parameters<typeof memory.getInvoice>): Promise<ReturnType<typeof memory.getInvoice>> => memory.getInvoice(...a);
export const getInvoicesFor = async (...a: Parameters<typeof memory.getInvoicesFor>): Promise<ReturnType<typeof memory.getInvoicesFor>> => memory.getInvoicesFor(...a);
export const getInvoiceByToken = async (...a: Parameters<typeof memory.getInvoiceByToken>): Promise<ReturnType<typeof memory.getInvoiceByToken>> => memory.getInvoiceByToken(...a);
export const getPaymentByToken = async (...a: Parameters<typeof memory.getPaymentByToken>): Promise<ReturnType<typeof memory.getPaymentByToken>> => memory.getPaymentByToken(...a);
export const getPaymentsFor = async (...a: Parameters<typeof memory.getPaymentsFor>): Promise<ReturnType<typeof memory.getPaymentsFor>> => memory.getPaymentsFor(...a);
export const getPayments = async (...a: Parameters<typeof memory.getPayments>): Promise<ReturnType<typeof memory.getPayments>> => memory.getPayments(...a);
export const getExpenses = async (...a: Parameters<typeof memory.getExpenses>): Promise<ReturnType<typeof memory.getExpenses>> => memory.getExpenses(...a);
export const getSubmissions = async (...a: Parameters<typeof memory.getSubmissions>): Promise<ReturnType<typeof memory.getSubmissions>> => memory.getSubmissions(...a);
export const getSubmission = async (...a: Parameters<typeof memory.getSubmission>): Promise<ReturnType<typeof memory.getSubmission>> => memory.getSubmission(...a);
export const getTickets = async (...a: Parameters<typeof memory.getTickets>): Promise<ReturnType<typeof memory.getTickets>> => memory.getTickets(...a);
export const getTicketsFor = async (...a: Parameters<typeof memory.getTicketsFor>): Promise<ReturnType<typeof memory.getTicketsFor>> => memory.getTicketsFor(...a);
export const getTicket = async (...a: Parameters<typeof memory.getTicket>): Promise<ReturnType<typeof memory.getTicket>> => memory.getTicket(...a);
export const getTicketMessages = async (...a: Parameters<typeof memory.getTicketMessages>): Promise<ReturnType<typeof memory.getTicketMessages>> => memory.getTicketMessages(...a);
export const getSummary = async (...a: Parameters<typeof memory.getSummary>): Promise<ReturnType<typeof memory.getSummary>> => memory.getSummary(...a);
export const getBoard = async (...a: Parameters<typeof memory.getBoard>): Promise<ReturnType<typeof memory.getBoard>> => memory.getBoard(...a);
export const getAging = async (...a: Parameters<typeof memory.getAging>): Promise<ReturnType<typeof memory.getAging>> => memory.getAging(...a);
export const getCollectionRate = async (...a: Parameters<typeof memory.getCollectionRate>): Promise<ReturnType<typeof memory.getCollectionRate>> => memory.getCollectionRate(...a);
export const getClientsByService = async (...a: Parameters<typeof memory.getClientsByService>): Promise<ReturnType<typeof memory.getClientsByService>> => memory.getClientsByService(...a);
export const getMonthly = async (...a: Parameters<typeof memory.getMonthly>): Promise<ReturnType<typeof memory.getMonthly>> => memory.getMonthly(...a);
export const addClient = async (...a: Parameters<typeof memory.addClient>): Promise<ReturnType<typeof memory.addClient>> => memory.addClient(...a);
export const patchClient = async (...a: Parameters<typeof memory.patchClient>): Promise<ReturnType<typeof memory.patchClient>> => memory.patchClient(...a);
export const archiveClient = async (...a: Parameters<typeof memory.archiveClient>): Promise<ReturnType<typeof memory.archiveClient>> => memory.archiveClient(...a);
export const addProject = async (...a: Parameters<typeof memory.addProject>): Promise<ReturnType<typeof memory.addProject>> => memory.addProject(...a);
export const setStage = async (...a: Parameters<typeof memory.setStage>): Promise<ReturnType<typeof memory.setStage>> => memory.setStage(...a);
export const addProjectNote = async (...a: Parameters<typeof memory.addProjectNote>): Promise<ReturnType<typeof memory.addProjectNote>> => memory.addProjectNote(...a);
export const setProjectDue = async (...a: Parameters<typeof memory.setProjectDue>): Promise<ReturnType<typeof memory.setProjectDue>> => memory.setProjectDue(...a);
export const nextInvoiceNumber = async (...a: Parameters<typeof memory.nextInvoiceNumber>): Promise<ReturnType<typeof memory.nextInvoiceNumber>> => memory.nextInvoiceNumber(...a);
export const nextReceiptNumber = async (...a: Parameters<typeof memory.nextReceiptNumber>): Promise<ReturnType<typeof memory.nextReceiptNumber>> => memory.nextReceiptNumber(...a);
export const addInvoice = async (...a: Parameters<typeof memory.addInvoice>): Promise<ReturnType<typeof memory.addInvoice>> => memory.addInvoice(...a);
export const patchInvoice = async (...a: Parameters<typeof memory.patchInvoice>): Promise<ReturnType<typeof memory.patchInvoice>> => memory.patchInvoice(...a);
export const sendInvoice = async (...a: Parameters<typeof memory.sendInvoice>): Promise<ReturnType<typeof memory.sendInvoice>> => memory.sendInvoice(...a);
export const deleteDraftInvoice = async (...a: Parameters<typeof memory.deleteDraftInvoice>): Promise<ReturnType<typeof memory.deleteDraftInvoice>> => memory.deleteDraftInvoice(...a);
export const applyPayment = async (...a: Parameters<typeof memory.applyPayment>): Promise<ReturnType<typeof memory.applyPayment>> => memory.applyPayment(...a);
export const reversePayment = async (...a: Parameters<typeof memory.reversePayment>): Promise<ReturnType<typeof memory.reversePayment>> => memory.reversePayment(...a);
export const voidInvoice = async (...a: Parameters<typeof memory.voidInvoice>): Promise<ReturnType<typeof memory.voidInvoice>> => memory.voidInvoice(...a);
export const refundPayment = async (...a: Parameters<typeof memory.refundPayment>): Promise<ReturnType<typeof memory.refundPayment>> => memory.refundPayment(...a);
export const getCreditsFor = async (...a: Parameters<typeof memory.getCreditsFor>): Promise<ReturnType<typeof memory.getCreditsFor>> => memory.getCreditsFor(...a);
export const creditBalance = async (...a: Parameters<typeof memory.creditBalance>): Promise<ReturnType<typeof memory.creditBalance>> => memory.creditBalance(...a);
export const getCredit = async (...a: Parameters<typeof memory.getCredit>): Promise<ReturnType<typeof memory.getCredit>> => memory.getCredit(...a);
export const overpaymentToCredit = async (...a: Parameters<typeof memory.overpaymentToCredit>): Promise<ReturnType<typeof memory.overpaymentToCredit>> => memory.overpaymentToCredit(...a);
export const applyCredit = async (...a: Parameters<typeof memory.applyCredit>): Promise<ReturnType<typeof memory.applyCredit>> => memory.applyCredit(...a);
export const addExpense = async (...a: Parameters<typeof memory.addExpense>): Promise<ReturnType<typeof memory.addExpense>> => memory.addExpense(...a);
export const getExpensesFor = async (...a: Parameters<typeof memory.getExpensesFor>): Promise<ReturnType<typeof memory.getExpensesFor>> => memory.getExpensesFor(...a);
export const projectMargin = async (...a: Parameters<typeof memory.projectMargin>): Promise<ReturnType<typeof memory.projectMargin>> => memory.projectMargin(...a);
export const deleteExpense = async (...a: Parameters<typeof memory.deleteExpense>): Promise<ReturnType<typeof memory.deleteExpense>> => memory.deleteExpense(...a);
export const linkSubmission = async (...a: Parameters<typeof memory.linkSubmission>): Promise<ReturnType<typeof memory.linkSubmission>> => memory.linkSubmission(...a);
export const clientFromSubmission = async (...a: Parameters<typeof memory.clientFromSubmission>): Promise<ReturnType<typeof memory.clientFromSubmission>> => memory.clientFromSubmission(...a);
export const getSettings = async (...a: Parameters<typeof memory.getSettings>): Promise<ReturnType<typeof memory.getSettings>> => memory.getSettings(...a);
export const getSetting = async (...a: Parameters<typeof memory.getSetting>): Promise<ReturnType<typeof memory.getSetting>> => memory.getSetting(...a);
export const setSetting = async (...a: Parameters<typeof memory.setSetting>): Promise<ReturnType<typeof memory.setSetting>> => memory.setSetting(...a);
export const clearSetting = async (...a: Parameters<typeof memory.clearSetting>): Promise<ReturnType<typeof memory.clearSetting>> => memory.clearSetting(...a);
export const getTasksFor = async (...a: Parameters<typeof memory.getTasksFor>): Promise<ReturnType<typeof memory.getTasksFor>> => memory.getTasksFor(...a);
export const getTasks = async (...a: Parameters<typeof memory.getTasks>): Promise<ReturnType<typeof memory.getTasks>> => memory.getTasks(...a);
export const getUpdatesFor = async (...a: Parameters<typeof memory.getUpdatesFor>): Promise<ReturnType<typeof memory.getUpdatesFor>> => memory.getUpdatesFor(...a);
export const getDeliverablesFor = async (...a: Parameters<typeof memory.getDeliverablesFor>): Promise<ReturnType<typeof memory.getDeliverablesFor>> => memory.getDeliverablesFor(...a);
export const getDeliverable = async (...a: Parameters<typeof memory.getDeliverable>): Promise<ReturnType<typeof memory.getDeliverable>> => memory.getDeliverable(...a);
export const addTask = async (...a: Parameters<typeof memory.addTask>): Promise<ReturnType<typeof memory.addTask>> => memory.addTask(...a);
export const setTaskDone = async (...a: Parameters<typeof memory.setTaskDone>): Promise<ReturnType<typeof memory.setTaskDone>> => memory.setTaskDone(...a);
export const deleteTask = async (...a: Parameters<typeof memory.deleteTask>): Promise<ReturnType<typeof memory.deleteTask>> => memory.deleteTask(...a);
export const addUpdate = async (...a: Parameters<typeof memory.addUpdate>): Promise<ReturnType<typeof memory.addUpdate>> => memory.addUpdate(...a);
export const addDeliverable = async (...a: Parameters<typeof memory.addDeliverable>): Promise<ReturnType<typeof memory.addDeliverable>> => memory.addDeliverable(...a);
export const addVersion = async (...a: Parameters<typeof memory.addVersion>): Promise<ReturnType<typeof memory.addVersion>> => memory.addVersion(...a);
export const setApproval = async (...a: Parameters<typeof memory.setApproval>): Promise<ReturnType<typeof memory.setApproval>> => memory.setApproval(...a);
export const addTicket = async (...a: Parameters<typeof memory.addTicket>): Promise<ReturnType<typeof memory.addTicket>> => memory.addTicket(...a);
export const addTicketMessage = async (...a: Parameters<typeof memory.addTicketMessage>): Promise<ReturnType<typeof memory.addTicketMessage>> => memory.addTicketMessage(...a);
export const setTicketStatus = async (...a: Parameters<typeof memory.setTicketStatus>): Promise<ReturnType<typeof memory.setTicketStatus>> => memory.setTicketStatus(...a);
export const patchProject = async (...a: Parameters<typeof memory.patchProject>): Promise<ReturnType<typeof memory.patchProject>> => memory.patchProject(...a);
export const archiveProject = async (...a: Parameters<typeof memory.archiveProject>): Promise<ReturnType<typeof memory.archiveProject>> => memory.archiveProject(...a);
export const audit = async (...a: Parameters<typeof memory.audit>): Promise<ReturnType<typeof memory.audit>> => memory.audit(...a);
export const getAudit = async (...a: Parameters<typeof memory.getAudit>): Promise<ReturnType<typeof memory.getAudit>> => memory.getAudit(...a);
export const auditCount = async (...a: Parameters<typeof memory.auditCount>): Promise<ReturnType<typeof memory.auditCount>> => memory.auditCount(...a);
export const recordProviderEvent = async (...a: Parameters<typeof memory.recordProviderEvent>): Promise<ReturnType<typeof memory.recordProviderEvent>> => memory.recordProviderEvent(...a);
export const getProviderEvents = async (...a: Parameters<typeof memory.getProviderEvents>): Promise<ReturnType<typeof memory.getProviderEvents>> => memory.getProviderEvents(...a);
export const getProviderEvent = async (...a: Parameters<typeof memory.getProviderEvent>): Promise<ReturnType<typeof memory.getProviderEvent>> => memory.getProviderEvent(...a);
export const getProviderEventsByReference = async (...a: Parameters<typeof memory.getProviderEventsByReference>): Promise<ReturnType<typeof memory.getProviderEventsByReference>> => memory.getProviderEventsByReference(...a);
export const providerAttentionCount = async (...a: Parameters<typeof memory.providerAttentionCount>): Promise<ReturnType<typeof memory.providerAttentionCount>> => memory.providerAttentionCount(...a);
export const resolveProviderEvent = async (...a: Parameters<typeof memory.resolveProviderEvent>): Promise<ReturnType<typeof memory.resolveProviderEvent>> => memory.resolveProviderEvent(...a);
export const matchInvoice = async (...a: Parameters<typeof memory.matchInvoice>): Promise<ReturnType<typeof memory.matchInvoice>> => memory.matchInvoice(...a);
export const queueMessage = async (...a: Parameters<typeof memory.queueMessage>): Promise<ReturnType<typeof memory.queueMessage>> => memory.queueMessage(...a);
export const settleMessage = async (...a: Parameters<typeof memory.settleMessage>): Promise<ReturnType<typeof memory.settleMessage>> => memory.settleMessage(...a);
export const getMessages = async (...a: Parameters<typeof memory.getMessages>): Promise<ReturnType<typeof memory.getMessages>> => memory.getMessages(...a);
export const failedMessageCount = async (...a: Parameters<typeof memory.failedMessageCount>): Promise<ReturnType<typeof memory.failedMessageCount>> => memory.failedMessageCount(...a);
export const retryMessage = async (...a: Parameters<typeof memory.retryMessage>): Promise<ReturnType<typeof memory.retryMessage>> => memory.retryMessage(...a);
export const getEstimates = async (...a: Parameters<typeof memory.getEstimates>): Promise<ReturnType<typeof memory.getEstimates>> => memory.getEstimates(...a);
export const getEstimate = async (...a: Parameters<typeof memory.getEstimate>): Promise<ReturnType<typeof memory.getEstimate>> => memory.getEstimate(...a);
export const getEstimatesFor = async (...a: Parameters<typeof memory.getEstimatesFor>): Promise<ReturnType<typeof memory.getEstimatesFor>> => memory.getEstimatesFor(...a);
export const getEstimateByToken = async (...a: Parameters<typeof memory.getEstimateByToken>): Promise<ReturnType<typeof memory.getEstimateByToken>> => memory.getEstimateByToken(...a);
export const nextEstimateNumber = async (...a: Parameters<typeof memory.nextEstimateNumber>): Promise<ReturnType<typeof memory.nextEstimateNumber>> => memory.nextEstimateNumber(...a);
export const addEstimate = async (...a: Parameters<typeof memory.addEstimate>): Promise<ReturnType<typeof memory.addEstimate>> => memory.addEstimate(...a);
export const sendEstimate = async (...a: Parameters<typeof memory.sendEstimate>): Promise<ReturnType<typeof memory.sendEstimate>> => memory.sendEstimate(...a);
export const answerEstimate = async (...a: Parameters<typeof memory.answerEstimate>): Promise<ReturnType<typeof memory.answerEstimate>> => memory.answerEstimate(...a);
export const duplicateEstimate = async (...a: Parameters<typeof memory.duplicateEstimate>): Promise<ReturnType<typeof memory.duplicateEstimate>> => memory.duplicateEstimate(...a);
export const getPipeline = async (...a: Parameters<typeof memory.getPipeline>): Promise<ReturnType<typeof memory.getPipeline>> => memory.getPipeline(...a);
