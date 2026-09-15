# Getting a business out there: the compliance side

A plan, not a change. Nothing in this document has been built.

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
trademark is not adjacent to the identity — it is the identity, defended. The
seam is real; it is the LABEL that is wrong, not the pairing.

### Three ways to hold it, and the one to take

**A. A seventh service.** "Business Setup & Compliance" as its own slug.
Conceptually cleanest and the most expensive thing on this page. `ServiceSlug`
is a union type threaded through `lib/services.ts`, the header dropdown,
`/services`, the six work categories, `lib/onboarding.ts`'s per-service step
sets, the OG image route, and — the part that is not a refactor but a
migration — `serviceEnum` in `lib/db/schema.ts` and the `service` CHECK
constraint in `db/migrations/0002_onboarding.sql`. It also quietly changes what
the studio is: six creative services and one compliance desk reads as two
businesses sharing a website.

**B. A band inside the existing page.** Branding & Design keeps its definition;
compliance appears as a clearly separated section further down. Cheap, ships in
a day, no architecture touched. Weakness: the page now has two subjects and the
heading above it is doing all the work of explaining why.

**C. Widen the frame so both belong under it.** Keep the slug `branding` —
nothing migrates, no URL changes, no enum moves — and change what the service
is CALLED and what its lede says, so that registering the company and designing
its marks are visibly the same promise.

**Take C, implemented as B.** Change the words, not the architecture. The slug
is an internal identifier and the database does not care what the heading says.

### The naming

Current: **Branding & Design** — "One consistent identity across everything a
customer touches."

Proposed: **Brand & Business Identity** — "Everything that makes your company
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

**Headless browser against cac.gov.ng — no.** This is already ruled out in the
checklist for the SEO tools and the reasoning holds harder here. A browser
binary does not fit a serverless function; the checklist says so and that is
why Unlighthouse and Puppeteer were rejected. On top of that: it is scraping a
government portal, so any markup change breaks the tool silently; it puts our
IP in front of that portal at whatever rate our visitors generate, which is the
"impede our infra" risk in the brief and is also how an IP gets blocked; and
the legal footing is somewhere between unclear and bad. A free public tool that
can take down our own registration workflow is not worth having.

**A licensed identity API — yes, with a cap.** Prembly, Youverify, Verified.ng
and Mono all sell CAC lookups. They are metered, which is the whole design
constraint: a free public tool on a paid key is a bill somebody else controls.
That is not a reason not to build it, it is the reason the checklist already
has this item open:

> A shared rate-limit counter in Postgres for anything gating a metered key.
> `lib/rate-limit.ts` lives in one instance's memory and cannot protect a
> quota.

So that item is a prerequisite, not a nicety. It has to exist first.

### The honesty rule, carried over

The domain checker taught this and it applies with more force here: **a name
not found in the register is not an available name.** CAC can refuse a name
that is free today — too similar to an existing one, a restricted word needing
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
3. **The Postgres rate-limit counter.** A prerequisite for any metered key, and
   already an open checklist item in its own right.
4. **A provider decision**, with real prices in front of us: per-lookup cost,
   free tier if any, what their response actually contains, and whether their
   terms permit a public-facing free tool. This needs quotes, not a guess.
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
- **Which of the six services we actually deliver today**, versus which we
  broker or refer. The band has to be honest about that, and only the studio
  knows.
- **A budget ceiling for lookups**, which sets the daily cap on the free tool.
- **Whether the compliance work is quoted or priced**, because that decides
  whether the band ends in a price list or a conversation.
