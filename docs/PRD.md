# We Dig Creativity — Website PRD

**Company:** We Dig Creativity Solutions (WDC Solutions)
**Product:** Agency website — wdc (frontend on Vercel, future backend on Render)
**Version:** 1.0 — July 2026

---

## 1. Company overview

We Dig Creativity Solutions (WDC Solutions) is a full-service creative and
digital marketing agency. We are the creative engine behind brands that get
noticed, get found, and get results: we design identities, engineer software,
rank brands on search, ship apps, and grow audiences — affordably, and at a
premium standard that scales. We manage hundreds of client accounts, carry a
deep bench of testimonials and case studies, work with every budget, and keep
clients included at every step of the way.

**Motto:** *Brilliant simplicity of thought.*

## 2. Services

### 2.1 Branding & Design
Everything visual a company needs: graphic design, motion design, animations
and micro-animations, asset creation, company profiles, brand guides, flyers,
posters, banners, mementos, printables, and physical brand stands. One
consistent identity across everything a customer touches.

### 2.2 Search Engine Optimization (SEO)
Visibility end to end: keyword research and optimization, competitor
analysis, technical SEO, content strategy, Google Business Profile setup and
optimization, performance audits (PageSpeed / Lighthouse), Search Console
management — plus modern **AI visibility**: optimizing brands to be found and
cited by LLMs (ChatGPT, Claude, Gemini).

### 2.3 Full-Stack Web Development
Every kind of website: personal sites and blogs, business and company sites,
complex builds like e-commerce, and CMS-driven WordPress sites — custom or
CMS, whichever fits. Ongoing maintenance, continuous SEO optimization, and
performance care after launch.

### 2.4 Cross-Platform App Development
Web apps and mobile apps for iOS and Android from one codebase (Flutter,
React Native, Swift, Kotlin, C#), engineered systems, App Store / Play Store
delivery, and continuous updates.

### 2.5 Software Engineering
LLM and AI integration into new or existing software, product builds from
zero, scaling and growing existing products — anything software engineering,
we're there. Backends, databases (SQL and NoSQL), cloud (Google Cloud, Azure,
Oracle Cloud, AWS), Rust/Go services, APIs.

### 2.6 Social Media Marketing & PPC (folded into marketing)
Organic growth and follower campaigns, account management (Facebook,
Instagram, X, WhatsApp, TikTok, LinkedIn), automations and auto-replies, paid
ads, content calendars, and reporting that keeps clients in the loop.

## 3. Brand system

| Token | Value |
| --- | --- |
| Primary (deep royal blue) | `#000065` |
| Secondary (orange) | `#FF6500` |
| Heading font | Space Grotesk |
| Body font | Outfit |

- **Logo:** clasped hands forming a "C" with an orange pen nib (traced SVG in
  `frontend/components/brand/`); wordmark "We Dig Creativity" in Space
  Grotesk. Variants: auto (theme), navy, orange, white, black
  (`frontend/public/brand/*.svg`). Favicon = mark on white rounded tile
  (`frontend/app/icon.svg`).
- **Dark mode** leans on the primary navy (`#030318` page, `#0a0a3a`
  surfaces); **light mode** is white. Theme switch = animated View-Transition
  circle reveal from the header toggle.

## 4. Homepage concept

### Built in Phase 1
1. **Intro animation** (full-screen overlay, once per session): 20 tool
   logos scatter in → snap to a line → form a circle around "We Dig
   Creativity." → on scroll, morph into a bottom arc that shuffles → release
   hands off into the hero. Skip button + reduced-motion and repeat-visit
   bypass.
2. **Header**: fixed; transparent over the hero. On scroll it gains a theme
   surface and the full logo swaps to the mark (favicon). Desktop: logo /
   nav (Home, About Us, Services, Our Work, Blog) / Let's Talk + theme
   toggle. Mobile: theme toggle / centered full logo / GSAP staggered menu.
3. **Hero** (Trivvo-inspired): eyebrow, H1 "We make your business ›
   [rotating]" (TextType: unforgettable. / unmissable. / pixel-perfect. /
   everywhere. / intelligent. — one per service), description, CTAs ("Book a
   Strategy Call", "Explore Our Work"), right-side cycling image stack, and
   the **LogoLoop carousel** of the full toolbox at the bottom — the strip
   the intro logos land into.

### Next phases (not yet built)
Stats band (projects shipped, rating, clients) → Featured projects →
Services (five expandable cards) → Why choose WDC → Testimonials → Articles
→ FAQ → CTA banner → full footer. (Mirror the Trivvo reference in
`plans/inspo/image.png` with WDC's brand system.)

**Component library on the shelf:** `FallingText` (Matter.js physics words)
— candidate for the services keywords section or a playful 404.

## 5. Tooling logos

Full curated registry (73 marks) in `frontend/lib/logos.ts`; availability
table in `docs/logos.md`. simple-icons supplies official glyphs; Adobe,
Canva, LinkedIn, OpenAI, AWS, Azure, Oracle, Ahrefs, SE Ranking and C# render
as official-color monogram badges (their marks are not distributable via
simple-icons).

## 6. Tech

Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · motion
(framer-motion) · GSAP · next-themes · simple-icons · Matter.js (held).
Deploy: Vercel (`main` = production, `dev`/`staging` = previews). Secrets:
Doppler project `wdc`.
