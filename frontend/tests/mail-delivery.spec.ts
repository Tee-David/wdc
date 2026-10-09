import { expect, test } from "@playwright/test";
import { deliverMail } from "../lib/mail-delivery";
import { smtpHostname } from "../lib/mail-sender";

const rejection = { responseCode: 550, command: "DATA", response: "550 Message discarded as high-probability spam" };
const message = { text: "Read your invoice: https://example.com/invoice", html: "<p>Your invoice</p>", attachments: [{ filename: "invoice.pdf" }, { filename: "qr.svg", cid: "qr" }] };

test("SMTP greets with the sender domain rather than an ephemeral machine", () => {
  expect(smtpHostname("info@wedigcreativity.com.ng")).toBe("wedigcreativity.com.ng");
});

test("an explicit spam rejection retries the written text with real attachments once", async () => {
  const attempts: typeof message[] = [];
  const result = await deliverMail(message, async value => {
    attempts.push(value);
    if (attempts.length === 1) throw rejection;
    return "accepted";
  });
  expect(result).toBe("accepted");
  expect(attempts).toHaveLength(2);
  expect(attempts[1].text).toBe(message.text);
  expect(attempts[1].html).toBeUndefined();
  expect(attempts[1].attachments).toEqual([{ filename: "invoice.pdf" }]);
});

test("timeouts, auth failures and other refusals never trigger a second send", async () => {
  for (const error of [new Error("timeout"), { code: "EAUTH" }, { ...rejection, responseCode: 451 }, { ...rejection, command: "RCPT TO" }, { ...rejection, response: "550 mailbox unavailable" }]) {
    let calls = 0;
    await expect(deliverMail(message, async () => { calls++; throw error; })).rejects.toEqual(error);
    expect(calls).toBe(1);
  }
});

test("a second refusal propagates and plain messages are not retried", async () => {
  for (const value of [message, { ...message, html: undefined }, { ...message, text: "" }]) {
    let calls = 0;
    await expect(deliverMail(value, async () => { calls++; throw rejection; })).rejects.toEqual(rejection);
    expect(calls).toBe(value.html && value.text ? 2 : 1);
  }
});
