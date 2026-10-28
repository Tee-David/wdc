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
  attachments?: { filename?: string; cid?: string }[];
};

/**
 * The server rejected the message before accepting it. Try the written text
 * once, with NO attachments: measured against the host on 28 October 2026, a
 * receipt's text with its PDF was refused and the same text alone accepted in
 * the same minute, so keeping the files made the fallback fail the same way.
 * Every message that carries a file also links to the record it came from
 * (a receipt links its PDF), and the text says what was left off. Timeouts and uncertain outcomes are
 * never retried here.
 */
export async function deliverMail<T extends Message, R>(message: T, send: (message: T) => Promise<R>): Promise<R> {
  try {
    return await send(message);
  } catch (error) {
    const files = (message.attachments ?? []).filter(attachment => !attachment.cid);
    if (!spamRejected(error) || !message.text.trim() || (!message.html && !files.length)) throw error;
    const names = files.map(file => file.filename).filter(Boolean);
    return send({
      ...message,
      html: undefined,
      attachments: undefined,
      text: names.length
        ? `${message.text.trimEnd()}\n\nThe mail server would not take the attached ${names.length === 1 ? "file" : "files"} (${names.join(", ")}), so ${names.length === 1 ? "it was" : "they were"} left off. The link in this email opens the record ${names.length === 1 ? "it belongs" : "they belong"} to.\n`
        : message.text,
    });
  }
}
