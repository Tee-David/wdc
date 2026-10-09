/** Only an explicit SMTP DATA spam rejection is safe to retry in another format. */
export function spamRejected(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const reply = error as { responseCode?: number; command?: string; response?: string };
  return reply.responseCode === 550 && reply.command === "DATA"
    && /message discarded as high-probability spam/i.test(reply.response ?? "");
}

type Message = {
  text: string;
  html?: string;
  attachments?: { cid?: string }[];
};

/**
 * The server rejected the HTML before accepting it. Try the written text once,
 * keeping document links and actual files; inline pictures belong to the HTML.
 * Timeouts and uncertain outcomes are never retried here.
 */
export async function deliverMail<T extends Message, R>(message: T, send: (message: T) => Promise<R>): Promise<R> {
  try {
    return await send(message);
  } catch (error) {
    if (!spamRejected(error) || !message.html || !message.text.trim()) throw error;
    return send({
      ...message,
      html: undefined,
      attachments: message.attachments?.filter(attachment => !attachment.cid),
    });
  }
}
