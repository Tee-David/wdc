# A tool for every service, without the bill

> "I want to have tools for every service that I offer, but not at something
> that would be cutting off my neck in terms of expenses. Maybe have fallbacks
> if it's not available."

This is the design that makes that safe. Nothing here is built except where it
says so.

## The idea in one line

A free tool converts because it answers a question the visitor was already
worried about. It costs us money only when somebody else's meter is running.
So the whole design is about keeping those two facts apart.

## 1. Three cost classes, and only one of them can hurt

Every tool we could build falls into one of three buckets. Treating them the
same is how a free tool becomes an invoice.

**Class A, free forever.** No key, no meter, nobody to bill us. Either pure
computation, or a protocol anyone may speak (RDAP for domains, DNS for mail
records), or fetching a public page the visitor gave us. The only cost is one
serverless invocation, which we are paying for anyway. These can be public,
uncapped and always on.

**Class B, somebody else's free quota.** PageSpeed Insights is the example:
free, but 25,000 calls a day against a key. The risk is being cut off, not
being charged. Cap it to stay inside their allowance and degrade when it is
gone.

**Class C, real money per call.** The CAC register lookup is the only one we
have on the table, at roughly ₦19 a call. This is the class that can cut a
neck. One at a time, hard budget, aggressive cache.

The two tools already shipped, the domain checker and the email spoof checker,
are both Class A. They have cost nothing and will keep costing nothing.

## 2. The four rules

### Rule 1: every tool has a Class A floor

**No tool may exist that can only answer by spending money.** The metered call
is an UPGRADE on an answer we can already give for free, never the answer
itself.

This is the whole trick, and it is what makes "it doesn't have to be always
available" safe. The tool is always available. What degrades is the expensive
half of it. A visitor who arrives on a day the budget is spent still gets a
real answer, still gets it instantly, and never sees an error.

For the CAC checker that floor is concrete: the name rules under CAMA 2020
section 852 are law, they are public, and checking a name against them costs
nothing. Roughly speaking, that catches the two commonest reasons a filing is
rejected before the register is ever consulted.

### Rule 2: the cap is set in naira, not in calls

A cap of "400 lookups" means nothing to anyone. A cap of "₦8,000 a day" is a
decision the studio can actually make. The registry carries the cost per call
and the daily budget; the call limit is derived from them. One number to
change, and it is the number you think in.

`lib/quota.ts` already enforces a call ceiling and already fails closed. This
is the layer on top that makes the ceiling meaningful.

### Rule 3: cache before you spend

The single largest lever, and the cheapest to build. Two people checking the
same business name on the same day should cost one lookup, not two. The CAC
register changes slowly, so a cache measured in days is honest rather than
stale, and it turns a tool that gets shared around WhatsApp from a bill into a
rounding error.

Worth being concrete about the shape of the saving: the cost of a tool is not
the number of visits, it is the number of DISTINCT queries. Popular names are
checked over and over. Cache on the normalised query, not the raw string, so
"Wendi Loveee Ltd" and "wendi loveee limited" are one lookup.

### Rule 4: running out is a lead, not an error

When the budget is spent, the tool must not say "come back tomorrow". It gives
the free answer and then offers the human one:

> We have run a lot of these today. Leave your email and we will check the
> register by hand and tell you.

That is a better outcome than the automated answer, not a worse one. It ends
with a name, an email and a reason to reply. **The cap being reached is the
most valuable thing that happens on the page**, so it should be designed like
a feature rather than apologised for like a fault.

## 3. What each service could have

Ranked by whether it answers something a visitor is ALREADY anxious about,
because that is what converts. A tool nobody is worried about is a utility: it
costs maintenance and it converts strangers into strangers.

### Tier 1: real anxiety, direct line to a sale

| Service | Tool | Class | State |
| --- | --- | --- | --- |
| Web | Domain checker, "is your business name still free?" | A | **Shipped** |
| Web | Email spoof checker, "can someone send an invoice as you?" | A | **Shipped** |
| Brand & business | CAC name checker, "can you even have this name?" | A floor + C upgrade | Floor built, upgrade needs a provider |

The CAC one is the strongest tool on this list, because the anxiety is sharp,
the answer is genuinely hard to get elsewhere, and it leads directly to work
the studio delivers.

### Tier 2: real anxiety, worth building next

| Service | Tool | Class | Why it converts |
| --- | --- | --- | --- |
| SEO | Page readiness check: fetch their URL, report title and description lengths, H1 count, canonical, robots, sitemap, structured data, image alt text | A | "Why can't anyone find me" is the question every SEO enquiry opens with. Costs one HTTP fetch. |
| SEO | Core Web Vitals, as an upgrade on the above | B | The PageSpeed key already exists. Free, capped by Google. |
| Software & AI | Honest LLM cost estimator: volume in, monthly naira out | A | Pure arithmetic. On brand for a studio that says plainly when a model is not the answer, and it disqualifies bad-fit enquiries before they reach a call. |

### Tier 3: useful, cheap, but lower intent

| Service | Tool | Class | Caveat |
| --- | --- | --- | --- |
| Apps | Store readiness: upload one icon, get every size Apple and Google demand, plus the transparency warning that gets icons rejected | A, entirely in the browser | Zero server cost. Attracts developers as much as clients. |
| Social | Campaign link builder | A, client side | Honestly, this attracts marketers, not customers. Cheap to build, low return. |

### The counterpoint, said plainly

**Six tools is not the goal. Six reasons to talk to us is.** Filling a grid
produces two excellent tools and four that exist to make a row complete, and
every one of the four is a page that can break silently and still has to be
maintained.

The recommendation is tiers 1 and 2: five tools, four of them free forever,
covering web, brand and SEO, which is where the enquiries already come from.
Tier 3 only if a quiet week wants filling.

## 4. What is built and what is next

**Built.**

- `lib/quota.ts` and migration 0005: the shared counter, failing closed, with a
  global bucket. Proved under concurrency by `npm run db:check-quota`.
- `lib/cac-name.ts`: the Class A floor for the CAC checker. The CAMA 2020
  section 852 rules, checked in memory, no network and no key.
- `lib/tools.ts`: the registry both the footer and the service pages read, so a
  new tool appears in both the moment it is added.

**Next, in order.**

1. The naira-denominated cap in the registry (Rule 2). Small, and it should
   land before any metered call exists rather than after.
2. The shared lookup cache (Rule 3). Same.
3. The CAC tool page, on the free floor alone. It is useful without the
   register lookup and it can ship before a provider is chosen.
4. The provider, when pricing is known. The metered layer then slots under the
   existing page.
5. The SEO page-readiness tool, which is Class A and blocked by nothing.

Note the order: the tool ships before the money does. That is deliberate, and
it is the cheapest possible way to find out whether anyone actually uses it.
