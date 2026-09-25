// A tiny SMTP sink for local tests: accepts AUTH, refuses any recipient
// containing "refuse", and writes each accepted message to MAIL_DIR.
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
const PORT = Number(process.env.SINK_PORT || 2525);
const DIR = process.env.MAIL_DIR || "/tmp/wdc-mail";
fs.mkdirSync(DIR, { recursive: true });
net.createServer((sock) => {
  let buf = "", data = false, body = "", rcpt = [], authStep = 0;
  const say = (s) => sock.write(s + "\r\n");
  say("220 sink ready");
  sock.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    let i;
    while (true) {
      if (data) {
        const end = buf.indexOf("\r\n.\r\n");
        if (end < 0) return;
        body += buf.slice(0, end); buf = buf.slice(end + 5); data = false;
        const f = path.join(DIR, `${Date.now()}-${Math.random().toString(36).slice(2)}.eml`);
        fs.writeFileSync(f, `X-Rcpt: ${rcpt.join(",")}\r\n${body}`);
        body = ""; rcpt = []; say("250 queued"); continue;
      }
      if ((i = buf.indexOf("\r\n")) < 0) return;
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      const up = line.toUpperCase();
      if (authStep === 1) { authStep = 2; say("334 UGFzc3dvcmQ6"); continue; }
      if (authStep === 2) { authStep = 0; say("235 ok"); continue; }
      if (up.startsWith("EHLO") || up.startsWith("HELO")) { sock.write("250-sink\r\n250-AUTH PLAIN LOGIN\r\n250 OK\r\n"); }
      else if (up.startsWith("AUTH PLAIN")) say("235 ok");
      else if (up.startsWith("AUTH LOGIN")) { authStep = 1; say("334 VXNlcm5hbWU6"); }
      else if (up.startsWith("MAIL FROM")) say("250 ok");
      else if (up.startsWith("RCPT TO")) {
        if (/refuse/i.test(line)) say("550 5.1.1 No such user here");
        else { rcpt.push(line.replace(/^RCPT TO:\s*/i, "")); say("250 ok"); }
      }
      else if (up === "DATA") { data = true; say("354 go"); }
      else if (up === "RSET") { rcpt = []; say("250 ok"); }
      else if (up === "NOOP") say("250 ok");
      else if (up === "QUIT") { say("221 bye"); sock.end(); }
      else say("250 ok");
    }
  });
  sock.on("error", () => {});
}).listen(PORT, "127.0.0.1", () => console.log(`sink on ${PORT}, writing to ${DIR}`));
