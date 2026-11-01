/** A mail server's refusal, in words the owner can act on. The raw reply stays in the message log. */
export function mailReason(error: string): string {
  if (/high-probability spam/i.test(error)) return "The old mail server refused it as spam. Resend it: mail now goes through the new server.";
  if (/timed? ?out|ETIMEDOUT|Greeting never received/i.test(error)) return "The mail server did not answer in time. Resend it.";
  if (/ECONNREFUSED|ECONNRESET|ESOCKET|Connection closed/i.test(error)) return "The connection to the mail server dropped. Resend it.";
  if (/\b55[0-4]\b.*(user|mailbox|recipient|address)|unknown user|does not exist|no such user/i.test(error)) return "That address does not exist. Check it, then resend.";
  if (/auth|535|credentials/i.test(error)) return "The mail server refused our login. Check Settings › Email.";
  return error;
}
