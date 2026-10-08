/** The services a mail connection can be, and the fields each needs. Plain data, shared by the server and the admin form. */
export type Kind = "smtp" | "postmark" | "brevo";
export const KINDS: Record<Kind, { label: string; secrets: { key: string; label: string }[]; fields: { key: string; label: string; placeholder?: string; hint?: string }[] }> = {
  smtp: { label: "Another mail server (SMTP)", secrets: [{ key: "password", label: "Password" }], fields: [
    { key: "host", label: "Server", placeholder: "smtp.example.com" }, { key: "port", label: "Port", placeholder: "465" },
    { key: "user", label: "Username" }, { key: "secure", label: "Encryption", hint: "ssl for port 465, starttls otherwise" },
  ] },
  postmark: { label: "Postmark", secrets: [{ key: "token", label: "Server token" }], fields: [{ key: "stream", label: "Message stream", placeholder: "outbound" }] },
  brevo: { label: "Brevo", secrets: [{ key: "apiKey", label: "API key" }], fields: [] },
};

