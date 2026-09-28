# Queue: what the owner has asked for and is not done yet

Top to bottom. Tick `[x]` and add the commit when done. Each item: the owner's
words (lightly trimmed), the screenshot, where to start, and the check that
proves it. Phone checks are at 390px (and 320px for anything text-heavy).

## Bugs the owner hit (do these first)

- [x] **1. Onboarding dropdown lists do not scroll** on a phone ("I am unable to scroll dropdown options in the onboarding form. Fix this. And any other similar issue like that."). `screenshots/01-*.jpg`: the Industry sheet. Fixed in `2cfc15e`.
  Start: `components/onboarding/select-field.tsx`, `picker.tsx`/`picker.css` (bottom sheet), `components/tools/option-select.tsx`. Likely Lenis or a touch handler eating the gesture, or the list has no bounded height with `overflow-y:auto`. Mark the scroll region `data-lenis-prevent`, give it `overscroll-behavior: contain`, and check EVERY other sheet/menu/combobox (admin `components/admin/form.tsx` Select, search-select, country picker, date picker). Pin with a Playwright touch-scroll test (mobile viewport, `hasTouch`), asserting the list's `scrollTop` moves.

- [x] **2. "Which channel works best for project updates?" should allow more than one**, "Client dashboard" should read friendlier ("your portal", "your dashboard" or "client portal"), and it should be **selected by default**. `screenshots/02-*.jpg`. Fixed in `3368bda`.
  Start: `lib/onboarding.ts` (grep "Client dashboard"), and `lib/admin/types.ts`/`store.ts` where the same label is read back. Radios become checkboxes; the stored answer becomes a list (keep reading old single-value answers). Default checked = the portal option. Check the entry page, the PDF (`lib/forms/entry-pdf.ts`) and the emails still show it.

- [x] **3. Confetti still hangs on the onboarding "Thank you" screen.** `screenshots/03-*.jpg` shows pieces frozen at the bottom. Fixed in `e14b44f`.
  Start: `components/onboarding/confetti.tsx` / `.css`. An earlier fix gave every keyframe its transform; pieces still stop mid-fall. Make each piece's animation end fully off screen (or fade to 0) with `forwards` fill, and remove the layer on `animationend`. Test: after 6s no confetti element is visible.

- [x] **4. Studio notice emails show "me" as sender; the From name must be "We Dig Creativity".** `screenshots/04-*.jpg` (Onboarding brief email to the admin). Fixed in `4a65ff8`.
  Start: `lib/email.ts` (`sendMail`, From header), `lib/settings/registry.ts` `mail.fromName` (shipped value comes from `SMTP_FROM_NAME` or "WDC Solutions"). Make the shipped sender name "We Dig Creativity" and make sure notices to the studio send a From display name, not a bare address (Gmail shows "me" only when From equals the recipient with no name: give it a name).

- [x] **5. Entry attachments overflow sideways on a phone** ("Fix the overflow on mobile. It's not responsive. Drifting horizontally"). `screenshots/05-*.jpg`. Fixed in `912cdfa`.
  Start: `components/admin/forms/forms.css` `.adAtt` (made a rail on 2026-09-27). The rail's width is escaping the panel: the panel/grid parent needs `min-width:0`, and `.adAtt` needs `max-width:100%`. Test at 320/360/390: `document.documentElement.scrollWidth <= innerWidth` on an entry with 3+ files (tests/entry-attachments.spec.ts has the fixture).

- [ ] **6. Entry page head on a phone: "Replay this page's tour" and Previous / 2 of 7 / Next are misaligned.** `screenshots/06-*.jpg`.
  Start: `app/admin/forms/[form]/entries/[entry]/page.tsx` (`adEntryNav`), CSS in `forms.css`. On a phone: Previous and Next each take half the row with the counter centred between (or above), same height, and the tour button full width above them.

- [ ] **7. Stat cards sometimes show no figures until a refresh** (Collected/Outstanding/Live projects tiles with the numbers missing). `screenshots/07-*.jpg`.
  Start: the KPI tiles use `components/admin/count-up.tsx`. The server renders the real figure; the count-up probably sets the text to 0/empty and waits for an IntersectionObserver or an arrival animation that never fires after a client-side navigation. Fix so the real figure is always in the DOM (count-up only animates a copy, or starts from the figure and never blanks it). Test: navigate client-side to Money and to Dashboard and assert every tile's value is non-empty.

- [ ] **8. "Why isn't there a setting to set/change my name as an admin user or staff."** `screenshots/08-*.jpg` (project card says "Babatope is answerable").
  Settings > My account has a Name form (`components/admin/settings/account-controls.tsx` `MyNameForm`). Check it saves for owner AND staff, that the new name shows in the sidebar/avatar and on new records, and that the owner can rename a staff member from Team and roles. If the owner simply did not find it, make it findable (first thing on My account, and in the avatar menu as "Your name and password").

- [ ] **9. Icon picker text squeezed into one-word lines on a phone** ("A random one unless you pick. The client sees it too." beside Shuffle). `screenshots/09-*.jpg`. Start: `components/admin/icon-picker.tsx`. Stack the hint under the preview and Shuffle on narrow screens.

- [ ] **10. Deliverables: upload files as well as a link, and the dialog opens with the close button highlighted.** `screenshots/10-*.jpg`. "Maybe we can have an 'upload file(s)' and/or add a link."
  Start: `components/admin/delivery.tsx` ("Add a deliverable"). Add a file drop/upload (reuse `components/admin/media-upload.ts` → R2, or the onboarding uploader pattern), one or more files and/or a link; show files on the deliverable for the client in the portal with Open/Download. Focus: see item 14.

- [ ] **11. Ticking a task crashes the page** ("This page did not load"). `screenshots/11-*.jpg`.
  Start: the project page task list (`components/admin/project-forms.tsx` "What is left", its action in `lib/admin/actions.ts` toggle task). Reproduce locally on a seeded project (tasks with a dependency, e.g. "Build the guideline set" waits for "Chase Tobi"), read the server error, fix, and pin with a test that ticks and unticks a task.

- [ ] **12. Attention rows on a phone: the ⋯ menu sits at the bottom; it should be on the right.** `screenshots/12-*.jpg` (dashboard "INV-2026-001 is overdue" rows). Start: `components/admin/dashboard.css` attention list; keep icon | text | ⋯ on one row at every width, ⋯ top-aligned right, 44px target.

- [ ] **13. A better tooltip design, responsive.** `screenshots/13-*.jpg` ("Naira. Leave it empty when nothing is agreed; empty is not zero." in a wide white box). Start: `components/onboarding/tip.tsx` (used by the admin "?" hints too). Design: a compact popover anchored to the "?" with an arrow, max-width ~18rem, solid panel colour, stays inside the viewport and safe areas, closes on outside tap/Escape, both themes. Show the owner before/after screenshots.

- [ ] **14. Buttons and icons light up with a focus ring when clicked, and dialogs open with the close ✕ ringed.** `screenshots/14-*.jpg` (Post an update, Add a deliverable). Mouse/touch focus must not show a ring; keyboard focus must. Start: `components/admin/admin.css` `:focus-visible` rules (some use `:focus`), and the dialog component (`components/admin/form.tsx` Modal/Dialog) which focuses the close button on open: focus the dialog panel (`tabIndex=-1`) or the first field instead, like the drawer fix in `nav-drawer.tsx`. Sweep every `:focus {` in admin.css.

- [ ] **15. Blog editor: pictures and videos inserted INSIDE the article do not save or show on the live post.** Owner: "I was really talking about the editor itself … you attach an image, it doesn't actually save … doesn't show on the front end. I don't know if videos work."
  Start: `components/admin/blog-editor.tsx` (Tiptap), its Picture/Video panels, `lib/blog-doc.ts` `cleanDoc`/`safeImage` (the server strips any image whose host is not the bucket origin from `r2PublicBase()`), `app/blog/[slug]/page.tsx` renderer. Suspects: the uploaded URL's origin differs from `r2PublicBase()` in production (e.g. `CLOUDFLARE_R2_URL` vs the URL `uploadToMedia` returns), so `cleanDoc` drops the node silently; or the node type/attrs are not in the allowed schema for video. Reproduce with a real upload URL shape, make a dropped media node a visible refusal (never silent), and test save → reload editor → live post shows `<img>`/`<video>`. `tests/blog-media.spec.ts` exists.

## Proposals to show the owner first (artifact, then build on approval)

- [ ] **20. Hero, Option C refined.** Owner's brief, in their words:
  - Keep the right side (the motion) as it is in C.
  - Left side: the title and the rotating text **much more legible and bolder**, and the rotating line must **never break onto another line**.
  - Remove **all the service chips** (Branding, SEO, …). Keep only the eyebrow, the headline, the description and the two buttons.
  - Size and arrange the left block so it **matches the height and weight of the right section** on desktop.
  - On a phone: **centre-align** the text and buttons; make the motion area **a little less tall** so everything flows with good spacing.
  - Keep the **tools marquee at the bottom of the hero** (like today's "Powering brands with the world's best tools" + logo loop), on desktop and phone.
  - Cohesive, not distracting, and right in **both light and dark**.
  - Then publish the prototype; build it as the new hero only when the owner says so.
  Start from `prototypes/hero-reconcile/` (`src/shell.html`, `src/app.js`; `build.mjs` pulls the ten pieces and engine from `prototypes/hero-motion/src/`). Make a C-only page. Real tool logos for the marquee: `lib/logos.ts` (simple-icons paths) and `components/sections/hero.tsx` `LogoMarquee`. Phrases and the one-line rule: `components/sections/hero.tsx` `ROTATING_WORDS` and `tests/hero.spec.ts`. Measure the longest phrase on one line at 320/390/1440.

- [ ] **21. Google sign-in for clients and admins, designed as a flow first.** Owner: "wire it up … carefully account for when we are inviting them to the dashboard, when they sign in, when they sign up for the first time (continue with Google, maybe extra details like name), in their own settings page they can link or unlink Google … the same should work for admins: as an admin I can link my Google account as a sign-in method. Launch an agent to work on the Google stuff so I see how it looks on the login pages, sign-up pages, the flow, the options, settings, link/unlink."
  The owner says the Google API keys are already added (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, read in `lib/auth.ts`).
  Today: `lib/auth-google.ts` `GOOGLE_ALLOWED_ROLES` = owner and staff only (clients refused on purpose); `disableSignUp: true`; `accountLinking` requires verified email on both ends; admin can UNLINK only (`lib/admin/account-actions.ts` `unlinkMyGoogle`), there is no LINK.
  Design (artifact first) the screens: login (Continue with Google for everyone), invitation acceptance (accept with Google or a password; the invited email must match the Google email, and what the page says when it does not), first sign-in with Google (confirm name, anything missing), portal Settings and admin My account (Link Google / Unlink, unlink allowed only while another way in remains), errors (Google account not connected to any WDC account; different email). Then build: add `client` to allowed roles, a Link flow (`authClient.linkSocial`), keep "no open sign-up" (a Google identity only reaches an existing, invited row), update `tests/google-admission.spec.ts`.

## Standing items (from the checklist, need the owner)

- Apply migrations 0028–0032 in production (Settings > System > Apply).
- Decide: may contacts on a client record sign in to that client's portal?
- Decide on the Settings improvements proposal and the Pay button motion (ARTIFACTS.md).
- Services copy editing, a shared admin data table and the notification centre are large: proposal first.
- Checks that need the live site: post-deploy visual pass, Lighthouse, email spam placement, a real Paystack payment.
