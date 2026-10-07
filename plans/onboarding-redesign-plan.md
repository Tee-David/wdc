# Onboarding redesign: six service forms

Status: PLAN APPROVED 6 October 2026. Six artifacts built 7 October 2026 and waiting for the owner's review (section 14). The only code changed so far is the dropdown hardening. Updated 7 October 2026.
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
| Motion design | Seven clips from the owner's "Motion for Claude" zip, mapped in 6.7a. |
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
| Services and Works pages | Small content updates to each service page, and an update to the Works page. See section 13. Added 6 October 2026. |
| Design samples | The owner allows use of all samples in the Drive folder "We Dig Creativity - Graphic Samples". Use them well. Folder must be shared by link before they can be downloaded. |
| Deliverable | Plan and checklist live in `plans/` in this repo. |
| Free colour picker | The owner allows HeroUI's ColorPicker (v3, `@heroui/react`, built on React Aria) for the free picker only. See 6.2 and section 14.3. Allowed 7 October 2026. |
| Agents | At most two agents at once. Sonnet builds the artifacts and the plan. Haiku agents execute the build once the artifacts are approved. |
| Services and Works copy | Exact proposed copy is in [services-and-works-copy-proposal.md](services-and-works-copy-proposal.md). Waiting for approval. |

## 3. Open items and how they were settled

| # | Question | Status |
|---|---|---|
| O1 | Pre-fill from the sales call | **Settled 6 October.** The default stays the blank `/onboarding` link. The client picks the service. An optional pre-filled link must also exist for the owner to send. See 6.6. |
| O2 | Signed agreement or ticked section in the form | **Open.** Default: the form records acceptance and does not replace a signed agreement. |
| O3 | Which past work appears on the cards | **Settled 6 October.** The studio chooses from work already public on the site. Pool in 6.7. Gaps are listed there. |
| O4 | Which GitHub repos to read | **Settled 6 October.** Read the owner's account. Findings in 6.8. |
| O5 | Flutterwave and coolors.co | **Settled 6 October.** Both are correct. |

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
10. The free picker may use HeroUI's `ColorPicker` (owner allowed, 7 October 2026). Its shape: a trigger (swatch and label) opens a popover with preset swatches, a saturation and brightness area, a hue slider and a hex field. It outputs one colour. Only this part is HeroUI. The family and shade chooser, auto name, like slider and first choice mark stay custom. Conditions before it ships: it adds a dependency (the repo rule is no package for a small UI effect, so this is a named exception), its theme tokens must not fight the WDC tokens, buttons must use the WDC black and white pair, and on phones it must open as the site's bottom sheet and not as a clipped popover. A Haiku agent checks all four before merging.

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

### 6.6 Optional pre-filled link

- The default is the blank `/onboarding` link. The client chooses the service and fills everything in.
- The owner can also create a pre-filled link from the admin. It carries a chosen service and any answers the owner typed (name, business, scope notes). The client sees them filled in, confirms and edits.
- No personal data goes in the URL. The link is a one time token that points at a server side draft. The existing resume token and draft tables already do this. Check `lib/onboarding-server.ts` and the reissue route before adding anything. A new table needs a migration. Say so if so.
- A pre-filled answer is a normal answer. The client can change it. Fail closed on a missing or used token.

### 6.7 Card sample pool (past work already public on the site)

Chosen from the file names in `frontend/public/brand-work/` and the cases in `frontend/lib/work.ts`. I have not opened each image yet. Open and check each one before it ships. Only work that is already public is used.

| Card | Candidate samples |
|---|---|
| Logo | Moore Designs logo variants, Thinkers Diary logo, Habby, Direct Link, Marvs Pastries, Vickygold, Benedict Ogbogu |
| Full identity system | Moore Designs (system and mockups), Skinish logo system, MARFAA mockups, Thinkers Diary mockups |
| Brand guidelines | Dhiol World guide pages, TAB The Ajoks Brand guide pages, Skinish colour, type, voice and "don'ts" pages |
| Flyers | The flyer set (Abebi Treats, Aliyat Glamour, Bay Accessories, Kempes, Olanike and more) |
| Social templates | BAMSSA OOU, NIPSA OOU, SPAN OOU, Dhiol World monthly posts |
| Promotional branding | Delivery, fragrance, tailoring and hair sale promos |
| Packaging | MARFAA packaging, shopping bag work |
| Signage | Moore Designs signage and storefront, Mayrols signage |
| Stationery and cards | Business cards, stationery set, Moore Designs stationery, staff ID card |
| Pitch deck and profile | Realtors' Practice pitch decks (two PDFs, 26 slides, supplied by the owner 6 October). Use cover, section and closing slides only. Millcon corporate profile pages as a second option. |
| Motion design | Only the studio's own hero films in `public/hero/film/`. There is no client motion work on the site. Gap. Ask the owner for clips or use the studio's own film. |

The owner has also allowed use of every sample in the Drive folder "We Dig Creativity - Graphic Samples" (about 100 files, including full brand guide PDFs for Millcon, Moore Designs, Marfaa, TAB and Dhiol World). Files are private. The folder must be shared by link before they can be downloaded. Download only what earns a place, and cut web sized copies.

### 6.7a Motion design samples (from the owner's zip, 6 October 2026)

Seven clips, 113 MB in total. I watched three frames of each. File names are the owner's.

| Clip | Length, size | Fits the option | Notes |
|---|---|---|---|
| `WDC_Social_9x16_voice_light.MP4` | 42.6 s, 1080x1920 | Social reel | Studio promo. Has voice. |
| `WDC_Social_16x9_voice_light.MP4` | 42.6 s, 1920x1080 | Promo video | Same film in landscape. Shows past brand work. |
| `Litch_ChaosEdition_9x16.MP4` | 59.6 s, 1080x1920 | Social reel | Client film for Litch Consulting. |
| `Litch_ChaosEdition_16x9.MP4` | 59.6 s, 1920x1080 | Explainer | Same film in landscape. |
| `76f12f6e-...MP4` | 15 s, 1080x1350 | Social reel (4:5 post) | Realtors' Practice animated post. |
| `ScreenRecording_09-30-2026 12-16-27 PM_1.mov` | 18.7 s, 1180x652 | Explainer | Realtors' Practice story, ends on the logo. A screen recording, so lower quality. |
| `8032c514-...MP4` | 20 s, 832x464 | Explainer | Studio services path animation. Small frame size. |

Gaps and cautions:

- No clip is a stand alone logo reveal. Option: cut the first seconds of the Realtors' Practice clips, or ask the owner for one.
- No clip is a website hero loop. The repo already has the studio hero films in `public/hero/film/`.
- Litch Consulting and Realtors' Practice are clients. Both are on the site as work. Ask the owner to confirm that these films may be shown.
- Two clips show place names (Lagos, Lekki, Nairobi, Dubai) inside the client's own scenes. The site rule is no city names in copy. The rule is about copy, not client footage. Ask the owner.
- The raw files must not go in git. For the cards, cut muted loops of 3 to 6 seconds, each under about 600 KB, with a poster image. Load them only when the card is on screen. Commit the ffmpeg script that makes them, so the result can be rebuilt.
- The pitch deck PDFs hold prices, market claims and a named person's contact details. Use only cover and closing style slides. Do not show the pricing slide.

### 6.8 What the studio builds (from the owner's repos, public facts only)

Used to word the app and software forms. Only work the site already lists is named here. Private repo details are not copied into this public repo.

- Cross-platform products: TraxStaff has a desktop app (Tauri and Rust), a mobile app (Expo, so React Native) and a web dashboard on one Fastify and CockroachDB backend.
- Large data platforms: Realtors' Practice combines a Next.js front end, an Express and Prisma back end, a Python scraping pipeline, Meilisearch, Redis and live updates.
- Business systems and AI pipelines: Litch Consulting has a role based admin, an invoicing engine and a Python pipeline with vector search (RAG).
- Marketplaces and payments: Nomarc Projects supports Flutterwave, SeerBit and Paystack.
- Offline first and AI: Voca is an installable web app that works offline, reads text aloud on the device, and has an AI assistant.
- Tooling: SelfHost (server control panel) and NairaGate (one SDK for Nigerian bank lookups across Paystack, Flutterwave, Korapay, Squad and Monnify).

So the Apps and Software forms can honestly list: offline first, real time updates, roles and permissions, payments, AI assistants, data pipelines, desktop and mobile and web from one back end. They still use plain words. Tool names only appear in the optional "I know what I want" reveal.

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
- Optional reveal for experienced clients: tools they already use (React Native, Flutter, Dart, databases). The list can draw on 6.8.
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
11. Update the Services and Works pages (section 13). Copy needs owner approval first. This can run next to step 8.

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

## 13. Services and Works pages (small updates)

Added 6 October 2026. These pages and the onboarding forms must tell the same story. The owner asked for tiny additions to each service page, some content improvement, and an update to the Works page. Each change below is a proposal for the owner to approve. Nothing here is built yet.

### 13.1 What the code does today

- The six services live in `frontend/lib/services.ts`. Each has a name, a lede, a body paragraph, six steps and a list of deliverables. The same data feeds the Service JSON-LD, so no price, no turnaround and no result may appear there.
- Works live in `frontend/lib/work.ts` and `showcase.ts`, with routes `app/work`, `app/work/[category]` and `app/work/[category]/[slug]`. Every category now leads with written case studies, and branding and social keep a wall of loose artwork below them.
- Case study text says it is "written in the admin editor". Before any edit, check whether Works are stored in files, in the database, or both. If the admin owns them, the owner or a seed adds them. A database change needs a migration, and the owner applies it in Settings > System.
- The page already mentions motion design, local SEO and AI visibility. We do not rewrite what is right.

### 13.2 Proposed changes to each service page

| Service | Small additions and changes |
|---|---|
| Branding & Design | Add the deliverables that the form now offers: pitch decks, packaging, signage, promotional branding, and motion design named plainly (logo reveals, promo videos, social reels, explainers, website loops). Add one line that small jobs (flyers, social templates) can be a single piece, a batch or a monthly service. Keep the name "Branding & Design". |
| SEO | Say that local SEO and AI search visibility are part of the service, in one plain line each. State that work starts at three months, if the owner agrees to say it in public. Keep "no promises" wording. |
| Web | Name the payment providers: Paystack and Flutterwave for local, Stripe, PayPal and Square for international, or the client's own provider. Add "free review of your current site". Say the studio picks the platform from what the site must do. Open question: the page shows Maintenance as a step and a deliverable, and the owner does not want maintenance shown up front. Move it to a quiet line, or keep it. Owner decides. |
| Apps | Add a short, kind line on what we do not build: games, deceptive apps, apps that need heavy hardware. Add "a prototype before the full build". Name offline first apps and apps that serve many users at once. |
| Software & AI | Name the four kinds of work in plain words: internal tools, automations, AI assistants, connecting systems and data pipelines. Add "we connect to any tool that has an API". Add "demos of past work on the discovery call". Keep the honest line on where AI helps and where it does not. |
| Social & PPC | Say the three packages are separate and can be combined: management, content creation and paid ads. Add "you approve before we post", content calendars, scheduling and trend ideas. |

Rules for all of them: plain words, no city names, no prices, no invented claims, no dashes or semicolons in new copy. Every claim must come from the owner's own words in this plan or from the existing page.

### 13.3 Proposed changes to the Works page

1. Add motion work. Use the cleared clips from the owner's zip: the studio promo, the Litch Consulting film, and the Realtors' Practice post and story. They play as muted loops, lazy loaded, each with a poster. Respect the performance rules (nothing heavy on the critical path, paused off screen, no animation under reduced motion).
2. Add the Realtors' Practice pitch deck as a Pitch deck piece. Show cover and story slides only. No prices, no contact details.
3. Add the best pieces from the full Drive sample folder, once it is shared. Fill the gaps the form cards showed: packaging, apparel and uniform, and real brand guide spreads (Millcon, Moore, Marfaa, TAB, Dhiol World). Cut web sized copies. Use `next/image` with set sizes.
4. Group Branding work by the same deliverable names as the form cards (Logo, Identity system, Brand guidelines, Flyers, Social templates, Promotional, Packaging, Signage, Pitch deck, Motion). A visitor and the onboarding form then use the same words. Keep it a simple filter or a set of headings, not a new page.
5. Add motion as a kind of work in the case study type, so a case study can hold a video loop next to its images. Keep it small. Check the type in `work.ts` first.
6. Content improvement: tighten category ledes so each one answers "what will I get" in one sentence. Keep client quotes only where the client wrote them. Keep metrics only where the client published them.
7. Keep the page opening the same way as every other landing page (the navy hero band, eyebrow, h1, lede). Do not invent a new layout.

### 13.4 Checks before it ships

- Owner approves the copy for each service and the Works additions.
- A client confirms nothing: permission for the Litch Consulting and Realtors' Practice items is already given by the owner.
- Page titles, descriptions, canonical tags and the Service JSON-LD still describe visible content truthfully.
- Responsive check at 320, 390, 768, 1024 and 1440 in both themes. LCP and layout shift unchanged. Video loops measured on a phone.
- Existing tests for services and work pages still pass. Update them in the same commit.

## 14. Artifact review (7 October 2026)

Six artifacts were built by two Sonnet agents from this plan. Each has three flows, a question map (wording, input type, required or optional, condition, stored key, "not sure" wording, a live showing or hidden tag), a phone preview that really branches, a "What the studio sees" panel, a review screen, a draft engagement section and a decisions list. All are private.

### 14.1 Links

| Service | Artifact |
|---|---|
| Branding & Design | https://claude.ai/artifact/HuH9m4pSzSyewNc8WKYAeA |
| Web | https://claude.ai/artifact/MriCB9ndK6H7PBryRjWQpV |
| SEO | https://claude.ai/artifact/3HCL7uWVikQm8zgpbtYdW6 |
| Apps | https://claude.ai/artifact/Kpt2Eq4XKkSyViw78SgGHh |
| Software & AI | https://claude.ai/artifact/X7ci8wZvcma7vgWPNbduJX |
| Social Media Marketing & Paid Ads | https://claude.ai/artifact/5w7yaRsx14gUzZaaA3Tg4Y |

Local copies and sources are in the session scratchpad and are lost when the session ends. The published artifacts are the record. Question counts: Apps 17, Software 16, Social 22. Branding, Web and SEO share one engine.

### 14.2 Measured and judged

Measured by the agents in headless Chromium: no horizontal overflow at 320, 390, 768 and 1280 in light and dark for any flow on any page. No console errors. No target under 44px. Every flow was clicked through to the review screen. Branching was scripted. Contrast was computed for text on the current phone screen only. Measured by the main session: a scan of the rendered text of all six pages found no city names, dashes or semicolons.

Judged by eye: the main session looked at Branding at 390 and 1280, Software at 390 and Social at 1280 in dark. The agents looked at Apps and the Branding card thumbnails.

Not checked anywhere: a real phone, Edge on iPhone, Safari, a keyboard only walk, screen readers, reduced motion, focus ring contrast, the published URLs opened as a viewer. The time estimates are formula guesses, not user tested. The question map table is wide on a 390px phone, so its rows are tall. Give the text column real width in the next pass.

### 14.3 Defects found in the artifacts (fix before the build uses them)

1. Branding has no Stationery card and no Apparel card. The sample pack held five stationery files (business cards, stationery set, Moore stationery, staff ID card, letterhead) and three apparel files. The agent reported none. Add both cards.
2. Hero chips read like "Time: 3 to 4 min to 8 min" on several pages. Reword to "3 to 8 minutes, depending on the path".
3. Branding uses Millcon profile pages for the Pitch deck card. Keep that until the Realtors' Practice deck is re-supplied.
4. Colour auto names use a table of about 130 entries, not the 140 standard CSS names. Fine, but review name quality across the spectrum.
5. The free picker is a plain code mock of HeroUI's shape. It is not the real component. See 6.2 item 10.

### 14.4 Decisions for the owner

Shared:

1. **Stored "not sure" value.** Today the code stores "I'm not sure; please advise me" with a semicolon. The artifacts show a comma. Change the constant, and map the old value on read. Recommended: yes.
2. **Quote timing.** The review screen cannot say when the quote arrives. What do we promise? Placeholder text says the owner will confirm.
3. **Shared steps.** "Your details" and "Finishing up" are untouched. Branding takes fixed dates, inspiration and assets. Confirm.
4. **Approver.** The closing step already asks who signs work off. Social adds a post approval question. Should one answer serve both? Recommended: one answer, shown under both headings.
5. **O2.** Ticks beside a signed agreement, or instead of it. Still open. Default stays: the form records acceptance and does not replace a signed agreement.
6. **Liability limit and dispute steps** are placeholders for the lawyer.

Branding & Design:

7. "I have references" in the Choose your depth flow opens uploads only at Deep. Quick and Standard show a notice. The plan said references open the box. Settle which.
8. "A bit of both" in style help: show the directions question too? The plan says only after "Suggest for me".
9. Motion design is a card with clip tiles marked "Clip pending". No clip is a logo reveal or a website hero loop.

Web:

10. The Services page still shows Maintenance as a step and a deliverable. Copy proposal option (b) is recommended.
11. Old `page_count` values use en dashes ("1–5"). Map on read. `wants_blogging`, `wants_maintenance` and `maintenance_after_reading` leave the default path and their keys stay. `wants_seo` stays optional. The new "What should the site do" cards map back to the old `features` values.
12. Site size stays internal. The opening question uses client words.

SEO:

13. May the public page say work starts at three months? `tools_access` becomes two Yes, No, Not sure questions. `geo` becomes "Which areas do you serve?" and shows only for local customers.

Apps:

14. "Who uses it" was in the plan twice. Split into where people use the app and who uses it and what each person may do. Confirm.
15. The plan says many files. The code limit is 8 files of 25 MB (`dropzone.tsx`). Keep or raise.
16. Retired: `payments` and `payments_other` (now in the feature checklist). Kept: `store_accounts`, `store_accounts_wanted`, `backend`, `offline`. The `platforms` key now holds iphone, android, web and desktop. Old iOS and Android values must still display.
17. Early notice for what we do not build is shown at the start. Confirm the wording.

Software & AI:

18. The AI data rules question shows only for "AI assistant or chatbot". Should data pipelines get it too? Recommended: yes.
19. "Very heavy software is out of scope" is only in the studio flags and the agreement. Add an early client notice? Recommended: yes, kind wording.
20. Kept `data_home` and `compliance`.

Social & Ads:

21. Retired `content_creator_wanted` and the per platform `handle_*` questions. Replaced by the Content creation package and one links box.
22. Ad budget wording and the four naira bands are kept from the code.
23. The Outcome first flow moves the existing goal question to the top.

### 14.5 Dropdown on Edge for iPhone

The owner's device is an iPhone, so Edge runs Apple's WebKit engine. Not reproducible here (Chromium only). Two hardening commits are in: 2d3a089 (no auto focus, visual viewport sizing, definite list height) and a second one on the working branch on 7 October that changes `.ob__f--sub` from `both` to `backwards` fill. A held transform animation keeps a conditional question's wrapper composited, which `picker.css` already names as a cause of lists that will not scroll on iOS. Still unverified on the device. If it still fails, the next step is a page scroll lock through `components/ui/scroll-reset.tsx`.

### 14.6 Order from here

1. Owner reviews the six artifacts and answers 14.4.
2. Sonnet fixes 14.3 and records the picks (one flow per service).
3. Lawyer reviews engagement text. Sections stay behind a flag.
4. Haiku agents, two at a time, build the shared pieces (phase 4) and then each service (phase 5), one commit each.
5. Services and Works pages after the copy is approved.
