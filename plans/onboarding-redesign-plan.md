# Onboarding redesign: six service forms

Status: PLAN FOR OWNER APPROVAL. Written 6 October 2026. No form code is changed by this document.
Checklist: [onboarding-redesign-checklist.md](onboarding-redesign-checklist.md). Keep both files current. A new agent must be able to continue from them alone.

Earlier plans still apply where this plan is silent: [onboarding-improvements-plan.md](onboarding-improvements-plan.md), [onboarding-flow-improvements-plan.md](onboarding-flow-improvements-plan.md) and [onboarding-service-experience-plan.md](onboarding-service-experience-plan.md). Where they disagree with this plan, this plan wins. The conflicts are listed in section 9.

## 1. The goal

The onboarding form turns a warm lead into a client. It must be easy for a person with no technical knowledge. It must still give the studio what it needs to quote and start.

Rules for every form:

1. Fewer questions and fewer steps than today. Today each form has 33 to 51 questions.
2. Each service has its own form. No generic questionnaire.
3. Show a question only when an earlier answer needs it.
4. Ask in plain words. Explain a technical word at the moment it appears.
5. Get what the quote needs now. Get everything else later in a meeting.
6. The client has already spoken to the team. They know about 10 to 20 percent of what the form asks. Do not make them start from zero.
7. A client who orders two services fills one form per service. Core details are not shared between forms. This is the owner's decision. Do not merge forms.

## 2. Decisions from the owner (6 October 2026)

| Topic | Decision |
|---|---|
| Motion design | Part of the service called **Branding & Design**. It is a deliverable card, not a new service. |
| Dropdown scroll bug | Fix now as a small, separate change. |
| Small jobs | Flyers and social templates are small jobs. They can be a single piece, a batch, or a recurring service. The form must ask which. |
| Animated cards | Use real past WDC work as the samples. |
| Style help ("Suggest for me") | Ask if the client wants to see options. Yes: we go ahead and send options. No: we proceed. The wording must be exact. It must say we will still do it well. |
| Colours | No role dropdown. The client picks colours and says how much they like each one (a slider), and which is the first choice. The studio sorts them into primary, secondary and so on. |
| Colour help | Link to Pinterest, Dribbble and Coolors as optional ideas. |
| SEO | Ask who their customers are. Ask for a goal and a time frame. The minimum time frame is 3 months. Ask only whether they have Search Console and Analytics. Access comes later. Do not ask for a monthly budget. Local SEO and AI search visibility are part of the service. |
| Web | Do not ask WordPress, Shopify or custom by default. Ask what the site must do. The studio picks the platform. Offer an optional "I already know what I want" reveal. Site size (small, medium, large) is internal scoring only. Offer a free review of an existing site. Maintenance plans are not shown up front. |
| Payments (web stores) | Name a few: Paystack and Flutterwave (local), Stripe, PayPal and Square (international). Clients may bring their own provider. Some setups are limited by the type of site. |
| Apps | The client picks who uses the app (several allowed). Ask the stage they are at. Offer a feature checklist (searchable, multiple choice). Warn early that games, fraud-like apps and heavy hardware work are not accepted. A prototype comes first. Scope and budget are already discussed before the form. |
| Software and AI | Internal tools, automations, AI chatbots and integrations. The client brings the idea and can upload as much detail as they like. Ask which tools to connect (any tool with an API). Ask what terms they have for AI and data. Demos happen on the discovery call. |
| Social and ads | Management, content creation and paid ads are separate packages and can be combined. Links in one box. Collect past results, platform accounts and ad budget. Ask if they will give access. We can also help set up accounts. Tell them about content calendars, scheduling, trends and approvals before we post. |
| Engagement terms | Each service has a deep client engagement section that protects the studio. See section 8. |
| Deliverable | Plan and checklist live in `plans/` in this repo. |

## 3. Open items for the owner

| # | Question | Default if no answer |
|---|---|---|
| O1 | Will the team pre-fill the invite from the sales call (service, scope, notes), so the client only confirms? Not answered yet. | Design the artifacts with a "confirm what we discussed" first screen. Build it only if the invite flow supports it. |
| O2 | Does the client also sign a separate agreement, or is the ticked section in the form the agreement? The existing Client Engagement Policy says a signed agreement wins. | Treat the form as a record of acceptance, not a replacement for a signed agreement. |
| O3 | Which past projects may appear as card samples, and do those clients allow it? | Use only work already public on the site. |
| O4 | Which GitHub repos should I read for stack evidence? Only `Tee-David/wdc` is attached to this session now. | Use `list_repos`, then attach only the repos you name, at artifact stage. |
| O5 | Please check two names. Is it Flutterwave (not "Flutter")? Is the colour site `coolors.co`? | Use Flutterwave and coolors.co. Verify before shipping. |

## 4. What the code does today (verified 6 October 2026)

- `frontend/lib/onboarding.ts` builds every form from `stepsFor(service)`. It always returns 4 steps: About you, goals, details, Finishing up.
- Shared questions: 13 (details, business, audience). Closing questions: 15, or 13 for branding.
- Questions per form (with conditionals): branding 33, seo 35, web 45, apps 37, software 35, social 51.
- Services in `frontend/lib/services.ts`: branding, seo, web, apps, software, social.
- Motion design appears on the public services page but not in the form.
- Colours are one text answer, `brand_colours`. Each line is `Name | #HEX | Role`. The admin and exports read that text. `frontend/lib/brand-colours.ts` and `frontend/scripts/check-brand-colours.mjs` own the format.
- Select lists: `components/onboarding/select-field.tsx`, `picker.tsx`, `picker.css`. They already have a bottom sheet on phones. The scroll bug is being reproduced and fixed separately (checklist phase 2).
- Autosave, resume links and "I'm not sure, please advise me" already exist. Keep them.
- Tests pin some keys and options: `frontend/tests/brief-preferences.spec.ts`, `onboarding.spec.ts`, `onboarding-styles.spec.ts`. Change them in the same commit as the code.
- The site already publishes a Client Engagement Policy in `frontend/lib/legal.ts`. Its own comment says a Nigerian lawyer should review its liability and engagement sections.

## 5. The three flow options per service

Every service artifact shows the same three ways to run the form. The owner picks one per service.

| Flow | Idea | Best for |
|---|---|---|
| **1. Size first** | One opening question: how big is the job? Small jobs finish in about 6 to 8 questions. Bigger jobs unlock more steps. | Mixed clients, many small jobs. |
| **2. Outcome first** | Open with what the client wants to happen, in plain words, then show the matching cards. Technical choices come last, and only if needed. | Clients with no technical knowledge. |
| **3. Choose your depth** | Everyone sees the same short core. Then the client picks Quick, Standard or Deep, with a time estimate for each. Deep unlocks references, uploads and detail. | Clients who want to spend more time, and clients who do not. |

All three flows follow these shared rules:

- Two to four questions on each screen on a phone.
- A visible time estimate and progress. The code has `minutesLeft` already.
- Every optional question is marked optional.
- Every question the client may not know has a reversible "I'm not sure, please advise me".
- A review screen at the end: "Here is what we heard." It also says what happens next and when the quote arrives.
- Questions that depend on an earlier answer appear right below it, not on a later step.

Each artifact lists all questions of a flow in one view, with the condition shown beside each question. The owner can then judge the logic. The step breaks come later.

## 6. Shared pieces

### 6.1 Cards that show the work

- Used where the client picks a deliverable or a style. Built from past WDC work (open item O3).
- Responsive: one column on phones, two or three on wider screens.
- Multiple picks allowed. Each card is a real checkbox with a visible state.
- Short animation only. Transform and opacity only. Pause when off screen. Off under reduced motion. Images through `next/image` from `public/`, with width and height set.
- A card teaches in one line what the thing is, and shows what it looks like.

### 6.2 Colour system (replaces the role dropdown)

1. The client opens "Colours you like". It is optional and starts closed.
2. They pick a colour family (red, orange, yellow, green, blue, purple, pink, brown, neutral). Then they slide through shades. A free picker stays available. Typing a hex code stays available.
3. The form names the colour on its own, for example "Deep green". The name comes from the 140 standard CSS colour names plus light, dark and deep modifiers from the shade. No new package.
4. Each colour has a slider from "Like it" to "Love it". One colour can be marked "First choice".
5. Up to five colours (existing limit). Add and remove stay simple.
6. Help text says these are suggestions. They may change in later meetings. Links to Pinterest, Dribbble and Coolors are optional ideas.
7. The studio sorts the colours into primary, secondary, accent, text and neutral. The sort is a suggestion shown in the admin. It is computed when read, not stored, so no migration. Rule of thumb: first choice becomes primary, the next most liked colour that differs enough becomes secondary, a strong saturated colour becomes accent, very dark or very light low saturation colours become text or neutral.
8. Stored form: keep `brand_colours` as readable text. Add the like level and the first choice mark to each line. Old lines without them must still read and display. Update `brand-colours.ts` and its check script together.
9. Keep: slider and swatches work with keyboard and touch. Targets 44px. A white swatch needs a visible edge.

### 6.3 Style help ("Suggest for me")

Three choices, in plain words:

- **I have references.** Upload images or paste links.
- **Suggest for me.** Then ask: "Would you like to see a few directions before we start?" Yes or No. The page says: "Either way, we will do this properly. If you say no, we will choose a direction that fits your business and confirm it with you before we go further."
- **A bit of both.**

The exact copy is written in the artifact and approved by the owner.

### 6.4 Internal scope signals

Each form produces a short internal note for the studio, shown in the admin. It is derived from the answers and never invented. It lists size, complexity and risks (for example: rush date, existing site migration, payments, batch or recurring work). The client does not see scoring. Web size (small, medium, large) lives here.

### 6.5 Reminders

An email sent about an hour after a client stops with an unfinished draft, with their resume link. Respect the existing rule: every message to a person can be switched off, and the setting lives with the person. This needs the outbox and a dedupe key. Check `lib/outbox.ts` first.

## 7. The six services

For each service: what the form asks, what is conditional, what the studio learns, and what to warn about.

### 7.1 Branding & Design (includes motion design)

Deliverable cards (multiple choice, real WDC samples): Logo, Full identity system, Brand guidelines, Flyers, Social templates, Promotional branding, Packaging, Signage, Pitch deck, Motion design. Motion design opens a small follow up: logo reveal, promo video, social reel, explainer, website hero loop, not sure.

Conditional logic:

- Job rhythm: one piece, a batch (then: how many), or recurring (then: how many a month, what kind).
- Something exists today (logo, guide): ask what must not change, and upload it.
- Style help: the 6.3 choice. References open the upload and links box.
- Colours: the 6.2 system, only for identity, guideline, flyer and template work.
- Where it will be used: only for logo and signage and packaging.
- Full guideline: voice, personality and layouts questions appear, optional, short.

Studio learns: deliverable list, rhythm, volume, references, colours ranked, constraints, deadlines.
Warn: ownership and licensing of supplied fonts and images (see section 8).

### 7.2 SEO

- Who are your customers? (local, online, businesses, mixed) opens the right follow up.
- Goal cards: more calls, more sales, more leads, more visibility, show up in AI answers. Plus a time frame: 3 months, 6 months, 12 months, not sure. The page states that results take time and the minimum engagement is 3 months. No guarantees.
- Local SEO: appears when customers are local. Asks service area and whether they have a Google Business Profile.
- AI search visibility: a card in the goals. Explains in one line: appearing in answers from AI tools.
- Tools: "Do you have Search Console? Analytics?" Yes, no, not sure. No access is asked now.
- Competitors, content owner, existing site address: keep, shorter.
- No budget question.

### 7.3 Web (Full-Stack Web Development)

- Start: new site or improving one. Existing site: address, what they like and dislike, and a free review is offered.
- Outcome cards: sell online, take bookings, show our work, get enquiries, share information, members only area, something else. Each opens only the follow ups it needs.
- Online store: shows the payment line from section 2. Local: Paystack, Flutterwave. International: Stripe, PayPal, Square. Bring your own provider is allowed. Limits depend on the site.
- Optional reveal "I already know what I want": WordPress, Shopify, custom, not sure. Hidden by default.
- Content ready: keep. Domain and hosting: keep, in plain words.
- Remove the maintenance questions from the default path. Maintenance is discussed per type of site, not shown up front. Keep the stored keys so old submissions still read.
- Internal size score from features, pages and integrations.

### 7.4 Apps (Cross-Platform App Development)

- Early notice, kind wording: we do not build games, anything deceptive, or apps that need heavy hardware.
- Who uses it? Multiple choice: iPhone, Android, web browser, desktop. Not sure is allowed.
- Stage: only an idea, designs ready, a prototype exists, an app to rebuild or extend.
- Feature checklist: searchable and multiple choice, grouped (accounts, payments, chat, maps, notifications, offline, admin panel and more). Plain words.
- The main job of the app in one sentence. Who uses it and what each person may do. Offline needs. Existing systems to connect.
- Optional reveal for experienced clients: tools they already use (React Native, Flutter, Dart, databases).
- Notice: the studio shows a first version (a prototype) before the full build. No budget question.

### 7.5 Software & AI

- Start with the problem, in plain words: "What slows your team down most?" or "Tell us the idea."
- Type cards: internal tool, automation, AI assistant or chatbot, connecting systems, data pipeline, something else, not sure.
- Large upload area for documents. Many files allowed within the existing upload limits.
- Tools to connect: a list the client writes in. Note that any tool with an API can be connected.
- AI work: "Do you have rules about the data (where it may go, who may see it)?" Free text plus not sure. This is where their terms are collected.
- Team size and users. How they will know it works. Keep, shorter.
- A line says demos of past work happen on the discovery call.
- Studio note: orchestrated pipelines are in scope. Very heavy software is not.

### 7.6 Social Media Marketing & Paid Ads

- Package cards: Management, Content creation, Paid ads, or a mix. Ads are a separate package.
- Links: one box, "Paste your links". The studio checks them.
- Past results: numbers or screenshots, optional.
- Ad budget: asked, as a range. The page says it is paid to the platform and is separate from the studio fee (keep the existing wording).
- Platform accounts: do they have them. Will they give access, or should the studio help set them up. Never collect passwords.
- How we work, shown in plain words: content calendar, scheduling, trends, approvals before posting. Ask who approves and how fast.
- Reporting: how often, and what counts as success.

## 8. Client engagement section (one per service)

Each form ends with its own engagement section before submit. Six different sections. Each is written for that service.

Shared headings:

1. What the engagement covers, and what it does not.
2. What the client must provide, and when.
3. Revisions and changes (a change request process for new scope).
4. Timelines depend on client feedback and approvals.
5. Fees, deposits, third party costs the client pays (platforms, stores, ad spend, tools).
6. Ownership: transfers after full payment. Portfolio rights stay with the studio.
7. Client promises (warranty): they own or may use everything they supply (logos, images, fonts, music, text, data).
8. Client indemnity: the client covers the studio against claims about material they supply or instructions they give.
9. No guarantees of results: rankings, traffic, sales, ad performance, app store approval.
10. Third party changes: platforms and stores (Google, Meta, app stores, payment providers) may change rules. The studio is not liable for that.
11. Limit of liability, and the cases that cannot lawfully be limited.
12. Data: the client is responsible for lawful use of their customers' data.
13. Ending the engagement, governing law (Nigeria), dispute steps.

Service specific content:

- **Branding & Design**: licensing of fonts and images, trademark checks are the client's duty, motion assets and music licensing, batch and recurring terms.
- **SEO**: minimum 3 months, no ranking promise, search engine and AI answer changes, client approves content changes, access handled securely.
- **Web**: third party plugins and platforms, payment providers and their terms, hosting and domain in the client's name, content and image rights, free review is advice not a guarantee.
- **Apps**: app store review and rules are outside our control, prohibited app types, prototype first, client owns store accounts, data and privacy duties.
- **Software & AI**: AI outputs can be wrong and need human review, the client sets data terms, third party API changes, no heavy software scope, the client is responsible for lawful use of the system.
- **Social & Ads**: platform policies and ad approvals, ad spend is paid to the platform, no performance guarantee, approvals before posting, client owns the accounts, supplied content rights.

How acceptance works: a tick for each section plus the client typing their full name. The record stores the text version, the date and time, and the answers. Check whether this fits the current answers JSON. If it needs a new column, ship a migration. The owner applies it in Settings > System.

Important. I can draft this text. I am not a lawyer. An indemnity or liability clause only protects the studio when a qualified Nigerian lawyer fits it to Nigerian law and to the signed agreement. A ticked box may carry less weight than a signed agreement. The text goes to a lawyer before it goes live. Ship the sections behind a flag until then.

## 9. What this plan changes in earlier plans

| Earlier plan | Change |
|---|---|
| Colour roles dropdown (flow plan, service plan) | Replaced by the 6.2 like-slider system. The text format stays readable and backward compatible. |
| "Improve existing questions before adding any" | Replaced. The owner now wants a reshaped flow per service. Keep stored keys where the question survives. |
| Web maintenance question | Removed from the default path. |
| Closing step brand questions for every service | Moved into the services that need them. |

Still in force: compact service picker, Client portal wording, save and resume rules, start over, optional profile setup after activation, design system rules, native mobile scrolling, no hover only help.

## 10. Order of work

1. Owner approves this plan. Answers O1 to O5.
2. Fix the dropdown scroll (small change, separate commit).
3. Read the owner's repos for stack wording (O4).
4. Build six artifacts, one per service, each with three flows. Real tokens, type and components. Review at 320, 390, 768, 1024, 1440 in both themes.
5. Owner picks one flow per service. Owner approves copy for the style help and the engagement sections.
6. Lawyer reviews the engagement text.
7. Build the shared pieces: cards, colour system, scope signals, review screen, reminders.
8. Build one service at a time. Each finished piece is committed and pushed to main and the working branch.
9. Update tests, `docs/status.md` and the README design system section with each component change.
10. Verify the deployed commit, not only the push.

## 11. How we will know it works

- Measured: lint, TypeScript, production build, targeted specs, round trip checks for colours and answers.
- Measured: every form completes by keyboard and by touch, including each condition, "Other", "not sure" and back.
- Measured: no horizontal overflow at 320px. Touch targets 44px. Dropdown lists scroll on a touch phone.
- Reviewed by eye, reported separately: card samples, animation, colour sorting results, copy tone.
- Not claimed until seen live: anything about the deployed site.

## 12. Risks

- Eighteen flow variants cost a lot to build and test. The three flows share one skeleton. Only the order and the gates differ.
- Branching hides errors. Each condition gets a test.
- Animated cards can hurt phones. Measure on a mid range phone before shipping.
- Changed keys break old drafts and admin views. Keep keys. Map old values on read.
- Indemnity text that a lawyer has not reviewed can mislead the client and the studio. Keep it behind a flag.
