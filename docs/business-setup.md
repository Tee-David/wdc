# Getting a business out there: the compliance side

A plan. Step 3 of the sequencing below is now built; everything else here is
still a proposal, waiting on the decisions in section 5.

## What was asked for

Trademark, EFCC, SCUML, TIN, CAC registration, corporate account opening, and
the guidance around them. Framed under Branding & Design, because that is where
the work already sits commercially, without losing what Branding & Design is.
Plus a free business name availability checker, sitting beside the domain
checker in the footer and on the service page.

## The question underneath it

> what WDC solutions does is that we get a business out there

That sentence is the plan. Everything below follows from taking it literally.

## 1. Does this break Branding & Design?

Yes, if it is dropped in as-is. Branding & Design is currently ten
deliverables, and every one of them is about how a company LOOKS: logo,
identity system, brand guide, motion, profile, flyers, stands. A reader
scanning that list and finding "SCUML registration" in it trips, and the
service stops meaning one thing.

But the two belong to the same moment. Somebody registering a company and
somebody commissioning a logo are the same person on the same week, and a
trademark is not adjacent to the identity; it is the identity, defended. The
seam is real; it is the LABEL that is wrong, not the pairing.

### Three ways to hold it, and the one to take

**A. A seventh service.** "Business Setup & Compliance" as its own slug.
Conceptually cleanest and the most expensive thing on this page. `ServiceSlug`
is a union type threaded through `lib/services.ts`, the header dropdown,
`/services`, the six work categories, `lib/onboarding.ts`'s per-service step
sets, the OG image route, and, the part that is not a refactor but a
migration, `serviceEnum` in `lib/db/schema.ts` and the `service` CHECK
constraint in `db/migrations/0002_onboarding.sql`. It also quietly changes what
the studio is: six creative services and one compliance desk reads as two
businesses sharing a website.

**B. A band inside the existing page.** Branding & Design keeps its definition;
compliance appears as a clearly separated section further down. Cheap, ships in
a day, no architecture touched. Weakness: the page now has two subjects and the
heading above it is doing all the work of explaining why.

**C. Widen the frame so both belong under it.** Keep the slug `branding`.
nothing migrates, no URL changes, no enum moves. Change what the service
is CALLED and what its lede says, so that registering the company and designing
its marks are visibly the same promise.

**Take C, implemented as B.** Change the words, not the architecture. The slug
is an internal identifier and the database does not care what the heading says.

### The naming

Current: **Branding & Design**. "One consistent identity across everything a
customer touches."

Proposed: **Brand & Business Identity**. "Everything that makes your company
real: registered, protected, and recognisable."

"Identity" is the hinge, and it is not a pun for its own sake. A CAC
certificate and a logo are both identity documents; one satisfies a bank, the
other satisfies a customer. The lede then earns the compliance work instead of
apologising for it.

Two alternatives considered and rejected. "Branding & Business Setup" is honest
and reads as two services joined by an ampersand, which is the problem we are
trying to solve. "Brand Foundations" is tidy and says nothing; a founder
searching for help does not search for foundations.

Everything else about the service stays exactly as it is. The six steps, the
ten deliverables, the case studies, the FAQs: untouched. Compliance is added
beneath them, not blended into them.

### What the page becomes

1. Hero, unchanged but for the name and lede.
2. The existing identity work, unchanged. This stays the bulk of the page.
3. **A new band: "Before the brand, the business."** Six items, each one
   sentence, each honest about what we do and do not do:
   CAC registration · TIN · SCUML · EFCC registration · trademark ·
   corporate account opening.
4. The free tool, beside the domain checker.
5. Proof, FAQs, CTA: unchanged.

The band sits AFTER the identity work, deliberately. A visitor who came for a
logo should meet the logo work first.

## 2. The business name checker

The same shape as the domain checker, and the same honesty problem, which we
have already paid to learn once.

### The two routes proposed, and the verdict on each

**Headless browser against cac.gov.ng: no.** This is already ruled out in the
checklist for the SEO tools and the reasoning holds harder here. A browser
binary does not fit a serverless function; the checklist says so and that is
why Unlighthouse and Puppeteer were rejected. On top of that: it is scraping a
government portal, so any markup change breaks the tool silently; it puts our
IP in front of that portal at whatever rate our visitors generate, which is the
"impede our infra" risk in the brief and is also how an IP gets blocked; and
the legal footing is somewhere between unclear and bad. A free public tool that
can take down our own registration workflow is not worth having.

**A licensed identity API: yes, with a cap.** Approved by the studio on
2026-09-15: "there are even paid APIs online that actually help you check.
Many businesses have them as an offering inside of their brands."

### Providers, measured 2026-09-15

Three were checked against their own documentation rather than their marketing.
The question that decides it is narrow: **can you search by NAME**, or only
look up a company you already have the RC number for. A tool for somebody who
has not registered yet is useless if it needs an RC number.

| Provider | Endpoint | Search by name? | Verdict |
| --- | --- | --- | --- |
| **Mono** | `GET /v3/lookup/cac?search={name or RC}`, optional `exact` | **Yes**, partial or full | The candidate |
| **Prembly** (IdentityPass) | `POST /identitypass/verification/global/company/search` | Yes, name + ISO-3166-1 alpha-2 country | Possible, needs checking |
| **Dojah** | `GET /api/v1/kyc/cac/basic` and `/advance` | **No**, RC number only | Ruled out |

**Mono** is the one to price. It searches the name a founder actually has in
their head, it exposes an `exact` flag so we can separate "this exact name is
taken" from "these look similar", and it claims over 3.1 million registered
businesses behind it.

**Prembly's** is a GLOBAL company search taking a country code, not a CAC
endpoint. Whether the Nigerian rows behind it are the CAC register or an
aggregated third-party dataset is not stated, and that difference is the whole
value of the tool. Confirm before trusting it; do not ship on it unverified.

**Dojah** takes an RC number and nothing else, which answers a question our
visitor cannot ask.

### What none of them sell

**Not one provider sells "is this name available."** Every one of them sells
"here is what is in the register." That is not a gap in the market, it is the
truth of the thing: availability is CAC's decision, made against similarity,
restricted words and their own discretion, and nobody can sell a promise they
do not control.

This is the honesty rule from the domain checker arriving early, and it is
load-bearing rather than cautious. It also means our tool is not worse than
anybody else's. Every competing checker is doing exactly this and some of
them describe it far less carefully than we are about to.

### The open-source route, checked 2026-09-15

Asked to find a GitHub tool for this. Two exist, both by the same author, both
published on 2023-12-10 and untouched since:

| Package | Stars | What it does |
| --- | --- | --- |
| `cac-verify` | 17 | Search CAC by name, verify by RC number |
| `company-verify` | 4 | The same, plus a FIRS TIN lookup |

**Both call the same endpoint**, which is the useful part of the finding:

    POST https://postapp.cac.gov.ng/postapp/api/front-office/search/company-business-name-it
    { "searchTerm": "..." }

No key, no account, no CAPTCHA, and a response carrying `approvedName`,
`rcNumber`, `classification`, `registrationDate` and `active`. Exactly the
shape our tool would want.

**It is dead.** Tested on 2026-09-15: CAC's own server answers with a
structured 404 and a request id, so the host is up and the path is gone. Both
packages are therefore broken, and have been for some unknown part of two and a
half years.

`cac-verify` would not have worked anyway. Its published build reads
`const companies = response.data.forEach(...)`, and `forEach` returns
`undefined`, so `data` is `undefined` on every successful call. Nobody has
noticed since 2023.

### What that settles

This is the argument against an undocumented endpoint, written by somebody
else and dated. Not "it might break one day": it broke, silently, in a package
with 17 stars, and the only reason we know is that we tried it. Any version of
this we build has to assume the same thing will happen to us, which is exactly
why `lib/cac-name.ts` exists and why the rule is that no tool may depend on a
lookup to be able to answer.

The endpoint the LIVE site uses today is the one traced from its own bundle,
`https://authapp.cac.gov.ng/name_similarity_app/api/public_search/search`,
taking `{ searchTerm, SearchType, classificationId }`. That is current because
the page is running on it right now. It carries every one of the same risks,
and it will have the same lifespan as the dead one.

### One more thing worth knowing about the money

CAC's public search is free. **The formal name search that issues an
availability code costs ₦500**, and that is the step that actually reserves a
name. So the paid step in this whole story is CAC's own, not a data vendor's,
and it is a step the client needs and we can perform for them. A free checker
that ends at "now let us run the formal search and reserve it" is a funnel into
a real, priced piece of work rather than into a quote.

### Pricing: still unknown, and it is the only thing blocking

Neither Mono nor Prembly publishes per-lookup pricing. Mono's general rate is
**$0.05 / about ₦19 per successful API call** with automatic volume discounts,
but Lookup is priced per endpoint and that table is behind the dashboard or
sales@mono.co. Dojah is wallet-funded (a `402` means top up).

So a cap cannot be set from public information. What is needed is one of: a
Mono account we can read the Lookup pricing table in, or a reply from sales.
Everything else is built.

### The prerequisite, now built

> A shared rate-limit counter in Postgres for anything gating a metered key.
> `lib/rate-limit.ts` lives in one instance's memory and cannot protect a
> quota.

**Done.** `db/migrations/0005_rate_limit_counters.sql` and `lib/quota.ts`, with
`npm run db:check-quota` proving the property that matters against a real
database: 200 simultaneous hits are counted exactly once each, with no lost
updates. It carries two kinds of bucket, and the second is the one the
in-memory limiter could never see: a `global` cap, because a thousand
different callers making one lookup each is a thousand paid lookups and not one
of them trips a per-caller limit. It fails closed: if the database is
unreachable it denies, because an outage must not become an uncapped bill.

### The free layer, built 2026-09-15

`lib/cac-name.ts` reads a proposed name against CAMA 2020 section 852 with no
network call and no key: the words section 852(2) says need the Commission's
consent, and whether the ending matches what is being registered. Those are the
two commonest reasons a filing comes back, and neither depends on who else is
on the register, so asking a paid lookup about them is spending money on the
wrong question.

It is also the fallback. A day with the budget spent, a provider down, or no
provider at all still produces a real answer instantly. 28 cases in
`npm run check:cac-name`, and roughly half of them assert that nothing was
reported: "Stateside" is not "State" and "Grouper" is not "Group", because a
false alarm on somebody's good name teaches them to ignore the real ones.

### The honesty rule, carried over

The domain checker taught this and it applies with more force here: **a name
not found in the register is not an available name.** CAC can refuse a name
that is free today: too similar to an existing one, a restricted word needing
consent, a form of words they will not accept. A tool that says "Available" and
is wrong costs somebody a rejected filing and a fee.

So the states are: **found in the register** (with what was matched),
**not found** (explicitly not the same as available), and **could not check**
(the provider is down, the quota is spent). The third is a first-class state
for the same reason `.ng` returning unknown is: it happens, and pretending
otherwise is the failure.

The result ends where the domain checker ends: a name is only yours once it is
registered, and this is the point at which we would do that for you.

### Where it lives

`/tools/business-name`, server-rendered, indexable, its own JSON-LD, in the
sitemap. `lib/tools.ts` already exists and both the footer Tools column and the
service page read from it, so the tool appears in both the moment it is added.
It maps to `branding`.

## 3. Sequencing

Nothing here is one change. In order, each shippable on its own:

1. **The rename and the lede.** One file, `lib/services.ts`. No migration. This
   is the decision that unblocks everything else and it is reversible in a
   minute.
2. **The compliance band** on the service page, as static content. No backend,
   no tool, no dependency. This is the part that earns revenue soonest, because
   the work is sold by conversation and the page only has to say we do it.
3. ~~**The Postgres rate-limit counter.**~~ **Built, 2026-09-15.**
   `db/migrations/0005_rate_limit_counters.sql`, `lib/quota.ts`, and
   `npm run db:check-quota` to prove it.
4. **A provider decision.** Narrowed to Mono above. What is still missing is
   the per-lookup price, which is not published and is what sets the cap. That
   needs the Mono dashboard or a reply from sales, not a guess. **This is now
   the only thing between us and shipping the tool.**
5. **The tool**, once 3 and 4 are done.
6. **Onboarding**, last. A compliance client answers different questions from a
   branding client, and `lib/onboarding.ts` is where that lives. Only worth
   doing once the work is actually coming in.

Steps 1 and 2 are days. Steps 3 to 5 depend on a provider and a budget.

## 4. What this does not touch

The slug `branding`, every URL, `serviceEnum`, the onboarding service steps,
the six work categories, the admin, the database. That is the point of taking
route C: the story widens and the architecture does not move.

## 5. What is needed before any of this starts

- **Approval of the name.** "Brand & Business Identity", or another one.
- ~~**Which of the six services we actually deliver today**, versus which we
  broker or refer.~~ **Answered 2026-09-15: we deliver.** CAC registration is
  filed by a partner firm that works as part of the team, and the studio does
  not name them publicly. That is ordinary subcontracting and the copy can
  speak in the first person: "we register your business", not "we can put you
  in touch with someone". One boundary worth keeping: we say we HANDLE the
  registration, never that we ARE the Commission or an accredited agent, if the
  accreditation sits with the partner rather than with us. Nobody has to be
  named for that to stay true.

  It also settles what the tool is for. A free checker is a giveaway when you
  refer the work on and a funnel when you do it yourself, and this is the
  second one.
- **A budget ceiling for lookups**, which sets the daily cap on the free tool.
  Now expressed in naira rather than calls, and the free rules layer means a
  spent budget degrades the tool instead of closing it. See
  `docs/tools-programme.md`.
- **Whether the compliance work is quoted or priced**, because that decides
  whether the band ends in a price list or a conversation.
