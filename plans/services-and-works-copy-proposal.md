# Services and Works pages: exact copy proposal

Status: PROPOSAL FOR OWNER APPROVAL. Written 7 October 2026. Nothing here is built.
Parent: [onboarding-redesign-plan.md](onboarding-redesign-plan.md) section 13. Checklist phase 7: [onboarding-redesign-checklist.md](onboarding-redesign-checklist.md).

Writing rules for all new copy: plain words, no city names, no prices, no turnaround promises, no dashes or semicolons, body text one colour. Every claim comes from the owner's own decisions in the plan or from the existing page. The same data feeds the Service JSON-LD (`frontend/lib/services.ts`), so nothing here may be a price, a time or a result.

## 1. Where the data lives (checked 7 October 2026)

- Services: `frontend/lib/services.ts`. A `Service` has `lede`, `body`, six `steps` and a `deliverables` list. No database. A copy change is a file change and needs no migration.
- Works, written case studies: `CASE_STUDIES` in `frontend/lib/work.ts` plus the `case_studies` table in `lib/work-db.ts`. The table is created at run time with `CREATE TABLE IF NOT EXISTS` and stores each case as JSON (`draft`, `live`). Adding an optional field such as `video` to the JSON is not a schema change. **No migration is needed** for any change in this proposal. New pieces in the files appear as soon as they are deployed. New pieces added in the admin editor appear when published.
- Works, loose artwork: `BRAND_KINDS` and `SOCIAL_POSTS` in `lib/showcase.ts`, shown by `BRANDING_GALLERY`, `SOCIAL_GALLERY` and `wallFor()`. Files only.
- Category ledes come from `SERVICES[].lede` through `WORK_CATEGORIES`. So a service lede change also changes its Works category lede. Keep them true for both pages.

## 2. Service pages: exact additions

Each block says what to add, with the proposed words. `[keep]` means the current text stays.

### 2.1 Branding & Design

- Lede `[keep]`: "One consistent identity across everything a customer touches."
- Body, add one sentence at the end: "Small jobs like flyers and social templates can be a single piece, a batch, or a monthly service."
- Deliverables, replace "Flyers, posters and banners" with "Flyers, posters and banners (one piece, a batch, or monthly)". Add these items:
  - "Pitch decks and company profiles"
  - "Packaging and shopping bags"
  - "Signage and storefront branding"
  - "Business cards and stationery"
  - "Promotional branding for sales and campaigns"
  - "Social media templates"
- Replace "Motion design and micro-animations" with "Motion design: logo reveals, promo videos, social reels, explainers and website loops".
- Steps `[keep]`.

### 2.2 SEO

- Lede `[keep]`.
- Body, add: "Local search and being found in AI answers are part of the work, not extras."
- Deliverables, change "AI and LLM visibility optimisation" to "Visibility in AI answers (ChatGPT, Claude, Gemini)". "Local SEO and map pack" `[keep]`.
- Add a quiet line under the deliverables: "No one can promise a ranking. Results take time, so our SEO work starts at three months." **Owner must approve the three month line before it goes public.**

### 2.3 Web

- Lede `[keep]`.
- Body, replace the second sentence ("Custom or CMS, whichever actually fits the job.") with: "You tell us what the site must do and we choose the platform that fits. We will also review your current site for free."
- Deliverables, add: "Online payments through Paystack and Flutterwave, or Stripe, PayPal and Square for customers abroad, or your own provider". Add: "A free review of your current site".
- Step six, "Maintenance": the owner does not want maintenance plans shown up front. **Owner decides.** Options: (a) keep as is, (b) rename the step "After launch" with the text "We stay available once the site is live." and drop "Ongoing maintenance" from the deliverables list, (c) remove the step and replace it with "Content", described as "Pages, images and copy ready before launch." Recommended: (b).

### 2.4 Apps

- Lede `[keep]`.
- Body, add: "You see a working first version, a prototype, before the full build." Add a second short sentence: "There are a few things we do not build: games, anything deceptive, and apps that need heavy hardware."
- Deliverables, add: "A prototype before the full build". Change "Offline handling and sync" to "Apps that keep working offline". Add "Apps that serve many users at once, with live updates".
- Steps `[keep]`.

### 2.5 Software & AI

- Lede `[keep]`.
- Body, add before the last sentence: "The work falls into four kinds: internal tools, automations, AI assistants and chatbots, and connecting the systems you already use. We can connect to any tool that has an API. Demos of past work happen on the discovery call."
- Deliverables, add: "Automations that remove repeat work", "AI assistants and chatbots", "Connections between the tools you already use", "Data pipelines".
- Keep the honest line about where AI earns its place.

### 2.6 Social Media Marketing & PPC

- Lede `[keep]`.
- Body, add after the first sentence: "Management, content creation and paid ads are three separate packages. You can take one, or combine them."
- Add: "You approve content before we post it. We plan the calendar, schedule the posts and bring trend ideas."
- Deliverables, change "Paid ads and PPC" to "Paid ads and PPC (a separate package)". Add "Content creation as its own package". Add "Approval before every post".
- Steps `[keep]`.

## 3. Works page: exact changes

All six categories already open with the navy hero band and lead with case studies. Keep that shape.

1. **Motion as a kind of work.** Add an optional `video?: { src: string; poster: string; alt: string }` to the `CaseStudy` type (`lib/work.ts`). A case study with `video` renders a muted, looping, lazy loaded clip next to its images, with its poster. Pause off screen. Static poster under reduced motion. The clips are cut to 3 to 6 seconds and under about 600 KB each by a committed ffmpeg script. **The owner's motion zip is not in this session. It must be uploaded again (checklist 7.2).**
2. **Branding grouped by deliverable.** The branding wall (`BRAND_KINDS`) groups by the same names as the form cards: Logo, Identity system, Brand guidelines, Flyers, Social templates, Promotional, Packaging, Signage, Stationery, Pitch deck and profile, Motion. Simple headings, not a new page. Check the current `BRAND_KINDS` labels first and rename only where they differ.
3. **Fill the gaps the form cards showed.** Packaging, apparel and uniform, brand guide spreads, pitch deck. Source: the Drive folder "We Dig Creativity - Graphic Samples" (reachable from the owner's account, 5 brand guide PDFs plus images). Cut web sized copies with `next/image` dimensions.
4. **Pitch deck piece.** The Realtors' Practice pitch deck, cover and story slides only. No prices, no contact details. **The PDFs were supplied in the earlier session and are not in this session. They must be uploaded again.**
5. **Category ledes.** Tighten so each one answers "what will I get" in one sentence. Since they come from `SERVICES[].lede`, the proposal is to keep the six ledes as they are, because they already answer that, and only change the Works hub intro if the owner wants a different line. Keep client quotes only where the client wrote them and metrics only where the client published them.
6. **Opening shape unchanged.** Navy band, eyebrow, h1, lede.

## 4. Decisions needed from the owner

1. Web maintenance: option (a), (b) or (c) in 2.3. Recommended (b).
2. May the SEO page say work starts at three months?
3. Approve or edit the copy in section 2 for all six pages.
4. Re-upload the motion clips and the pitch deck PDFs (not available in this session).
5. Confirm client footage showing place names inside the client's own scenes may be shown.
