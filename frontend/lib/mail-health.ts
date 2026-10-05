import { Resolver } from "node:dns/promises";

/**
 * Whether a domain's mail is set up to be believed.
 *
 * WHY THIS TOOL EXISTS AND WHY IT IS FREE. "Your domain says `p=none`, which
 * means anyone can send an invoice as you" is the single highest-intent
 * sentence this site can say to a Nigerian SME, and it is true of most of
 * them. It costs us nothing to say: `node:dns` only, no API, no key, no
 * quota, no dependency.
 *
 * WE KNOW THIS GROUND. The studio's own domain was diagnosed the same way and
 * written up in `docs/email.md`: SPF aligned, DKIM published,
 * MX correct, and mail still filed as spam because DMARC was `p=none` with no
 * reporting address and SPF ended `~all`. The tool tells a visitor what we had
 * to find out the hard way.
 *
 * ONE RESOLVER, ON PURPOSE. Everything goes through `lookup()` below so that
 * if a runtime ever blocks outbound UDP/53 this becomes a DNS-over-HTTPS call
 * in one place rather than in six. Verified working on Node: resolving this
 * studio's own domain returns its MX, its SPF and its `p=none` DMARC.
 */

export type Verdict = "good" | "weak" | "missing" | "unknown";

export type Finding = {
  id: "spf" | "dmarc" | "mx" | "dkim";
  label: string;
  verdict: Verdict;
  /** One sentence, in plain English, about what this means for them. */
  detail: string;
  /** The record itself, when there is one worth showing. */
  raw?: string;
};

export type MailHealth = { domain: string; findings: Finding[] };

/* A few seconds is generous for DNS. A resolver that has not answered by then
   is not going to, and the visitor should be told "could not check" rather
   than watched a spinner. */
const TIMEOUT_MS = 5000;

/**
 * Every lookup in this file goes through here.
 *
 * Cloudflare and Google are used as the resolvers rather than whatever the
 * platform's default is, because a serverless region's default resolver can be
 * an internal one with its own caching and its own view of the world, and the
 * answer a visitor gets should be the answer the internet gives.
 */
async function lookup(kind: "txt" | "mx", name: string): Promise<string[][] | null> {
  const resolver = new Resolver({ timeout: TIMEOUT_MS, tries: 2 });
  resolver.setServers(["1.1.1.1", "8.8.8.8"]);
  try {
    if (kind === "mx") {
      const records = await resolver.resolveMx(name);
      return records
        .sort((a, b) => a.priority - b.priority)
        .map((r) => [`${r.priority} ${r.exchange}`]);
    }
    return await resolver.resolveTxt(name);
  } catch {
    /* ENOTFOUND and ENODATA both mean "no such record", which for our purposes
       is the same as not published. The caller decides what that means: a
       missing SPF is a finding, a missing DKIM selector is just one of fifteen
       guesses that did not land. */
    return null;
  }
}

const flat = (records: string[][] | null) => (records ?? []).map((parts) => parts.join(""));

/** The provider behind an MX host, where the hostname gives it away. */
function mxProvider(host: string): string | null {
  const h = host.toLowerCase();
  if (h.includes("google") || h.includes("googlemail")) return "Google Workspace";
  if (h.includes("outlook") || h.includes("protection.outlook")) return "Microsoft 365";
  if (h.includes("zoho")) return "Zoho Mail";
  if (h.includes("yandex")) return "Yandex";
  if (h.includes("protonmail") || h.includes("proton.me")) return "Proton Mail";
  if (h.includes("titan") || h.includes("flockmail")) return "Titan";
  if (h.includes("improvmx")) return "ImprovMX";
  if (h.includes("mimecast")) return "Mimecast";
  if (h.includes("amazonaws") || h.includes("amazonses")) return "Amazon SES";
  return null;
}

function checkSpf(txt: string[]): Finding {
  const record = txt.find((t) => t.toLowerCase().startsWith("v=spf1"));
  if (!record) {
    return {
      id: "spf", label: "SPF", verdict: "missing",
      detail: "No SPF record. Nothing tells the world which servers may send mail as you, so anything that claims to be you is as credible as you are.",
    };
  }
  /* The qualifier on `all` is the whole point of an SPF record: it is the
     instruction for mail that did NOT come from a listed server. */
  if (/[-]all\s*$/i.test(record.trim())) {
    return {
      id: "spf", label: "SPF", verdict: "good", raw: record,
      detail: "Published and strict. Mail from anywhere you have not listed is told to fail outright, which is the strongest setting.",
    };
  }
  if (/~all\s*$/i.test(record.trim())) {
    return {
      id: "spf", label: "SPF", verdict: "weak", raw: record,
      detail: "Published, but it ends in ~all, a soft fail. Forged mail is marked suspicious rather than rejected, so it usually still arrives. -all is the stricter ending.",
    };
  }
  if (/\+all\s*$/i.test(record.trim())) {
    return {
      id: "spf", label: "SPF", verdict: "missing", raw: record,
      detail: "This record ends in +all, which authorises the entire internet to send mail as you. It is worse than having no record at all.",
    };
  }
  return {
    id: "spf", label: "SPF", verdict: "weak", raw: record,
    detail: "Published, but it does not end in a clear pass or fail instruction, so receivers are left to guess what to do with mail that is not from a listed server.",
  };
}

function checkDmarc(txt: string[]): Finding {
  const record = txt.find((t) => t.toLowerCase().startsWith("v=dmarc1"));
  if (!record) {
    return {
      id: "dmarc", label: "DMARC", verdict: "missing",
      detail: "No DMARC record. Nobody is told what to do with mail that fails your checks, and you receive no reports, so you cannot see it happening.",
    };
  }
  const policy = /\bp\s*=\s*(none|quarantine|reject)/i.exec(record)?.[1]?.toLowerCase();
  const hasReporting = /\brua\s*=/i.test(record);
  if (policy === "reject") {
    return {
      id: "dmarc", label: "DMARC", verdict: "good", raw: record,
      detail: hasReporting
        ? "Set to reject, with reports enabled. Mail pretending to be you is refused outright, and you can see the attempts."
        : "Set to reject, which is the strongest policy, but no rua address means you never see the reports that tell you it is working.",
    };
  }
  if (policy === "quarantine") {
    return {
      id: "dmarc", label: "DMARC", verdict: "weak", raw: record,
      detail: "Set to quarantine. Mail that fails your checks goes to spam rather than being refused, which is most of the way there.",
    };
  }
  return {
    id: "dmarc", label: "DMARC", verdict: "weak", raw: record,
    detail: hasReporting
      ? "Set to p=none, which means monitor only. Nothing is stopped, so anyone can send an invoice as you today and it will be delivered; at least the reports are on."
      : "Set to p=none with no reporting address. Nothing is stopped and nothing is reported, so anyone can send an invoice as you and you would never know.",
  };
}

function checkMx(records: string[]): Finding {
  if (records.length === 0) {
    return {
      id: "mx", label: "Mail servers", verdict: "missing",
      detail: "No MX records, so this domain cannot receive mail at all. If you are using it on business cards, mail sent to it is bouncing.",
    };
  }
  const host = records[0].split(/\s+/)[1] ?? records[0];
  const provider = mxProvider(host);
  return {
    id: "mx", label: "Mail servers", verdict: "good", raw: records.join(", "),
    detail: provider
      ? `Mail is handled by ${provider}.`
      : `Mail is handled by ${host.replace(/\.$/, "")}.`,
  };
}

/* The selectors worth guessing. DKIM has no discovery mechanism -- you cannot
   ask a domain which selectors it publishes -- so a prober can only try the
   ones the common providers use. A miss is therefore NOT proof of absence,
   and the wording below says so rather than accusing anyone. */
const SELECTORS = [
  "default", "google", "selector1", "selector2", "k1", "k2",
  "mail", "dkim", "s1", "s2", "smtp", "zoho",
  "mandrill", "sendgrid", "mailjet",
];

async function checkDkim(domain: string): Promise<Finding> {
  const found: string[] = [];
  await Promise.all(
    SELECTORS.map(async (selector) => {
      const records = flat(await lookup("txt", `${selector}._domainkey.${domain}`));
      if (records.some((r) => r.toLowerCase().includes("p="))) found.push(selector);
    }),
  );
  if (found.length > 0) {
    return {
      id: "dkim", label: "DKIM", verdict: "good",
      detail: `A signing key is published on ${found.length === 1 ? "the selector" : "selectors"} ${found.join(", ")}, so your mail can be signed and verified.`,
    };
  }
  return {
    id: "dkim", label: "DKIM", verdict: "unknown",
    detail: "No key found on the fifteen selectors we can guess. DKIM cannot be discovered, only guessed at, so this may simply mean yours uses a name we did not try.",
  };
}

/** The registrable domain from whatever somebody pasted, or null. */
export function normaliseMailDomain(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "").replace(/^www\./, "");
  /* An email address is the commonest thing a visitor pastes into a box that
     asks about their mail, so take the domain out of it rather than refusing. */
  if (value.includes("@")) value = value.split("@").pop() ?? "";
  value = value.split("/")[0].split("?")[0].split(":")[0].replace(/\.$/, "");
  if (!value || value.length > 253) return null;
  if (!/^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z]{2,63}$/.test(value)) {
    return null;
  }
  return value;
}

export async function mailHealth(domain: string): Promise<MailHealth> {
  const [txt, mx, dkim] = await Promise.all([
    lookup("txt", domain).then(flat),
    lookup("mx", domain).then(flat),
    checkDkim(domain),
  ]);
  const dmarcTxt = flat(await lookup("txt", `_dmarc.${domain}`));

  /* DMARC first, deliberately: it is the finding with the consequence a reader
     actually feels, and burying it under three green ticks would waste it. */
  return { domain, findings: [checkDmarc(dmarcTxt), checkSpf(txt), dkim, checkMx(mx)] };
}
