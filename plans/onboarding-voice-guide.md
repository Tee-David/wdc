# Onboarding voice and feel

Written 7 October 2026 after the owner asked for more ideas like the dropdown rule: how questions are asked, the words used, and a form that feels easy and intentional, never generic. Applies to all six forms. Rules for control types are in `onboarding-decisions.md` (decision 34). The research behind the numbers is in `onboarding-ux-research.md`.

## The voice

A studio person sitting across the table, not a form. Plain, warm and direct, with a little confidence. We say "we". We say what happens next. We say why when we ask something personal. Short sentences, about 15 words at most. No jargon without a gloss at the moment it appears. No "please" repeated, no "kindly", no "we require". Nigerian English cadence without slang: natural, never put on.

Never: dashes or semicolons in copy, city names, "We Dig Creativity" as digging, stress with orange or a second colour (stress with weight only), fake urgency, fake numbers.

## Ten ideas, and where each one lives

| # | Idea | What the client feels | Status |
|---|---|---|---|
| 1 | **Use their name and their business** in later screens and labels ("Now, Ada, about Moore Designs", "What should Moore Designs' site do?"). `{first_name}` and `{company}` in copy, with a neutral fallback when blank. | Somebody is paying attention to me | `fill()` in `lib/onboarding-voice.ts`, hooked into titles, labels and hints |
| 2 | **Industry aware examples.** The example inside a text box comes from their industry: a bakery sees cakes and orders, a clinic sees appointments. Twelve industries, five text questions. | The form knows my business | `exampleFor()` |
| 3 | **Reflect back, between screens.** After a screen, one plain line built only from what they picked: "A logo and flyers. A good place to start." Never invented. | I was heard, and I am moving | `echoFor()` |
| 4 | **Name what is next on the button.** "Next: your business", last button "Review and send". | I know where I am going | `nextLabel()` |
| 5 | **Milestone lines instead of "step 3 of 8".** "About 3 minutes left" always, plus "Halfway. The hard part is done." at half and "Nearly there." near the end. Time only goes down unless they add scope. | A short, honest road | `milestone()` |
| 6 | **A reason under anything personal.** One line saying why we ask: phone ("so we can reach you on WhatsApp"), the sign off person ("so feedback has one door"), the business description ("so we do not ask you again on the call"). | I trust the ask | in the step files as `hint` |
| 7 | **Say how to skip.** Optional questions say "Skip this if you like" and mean it, in place of the generic "(optional)". Not sure says what happens: "We will recommend one." | No pressure | `optionalLabel`, existing not sure copy |
| 8 | **Speaking, not typing.** Every long text question offers "Send a voice note on WhatsApp instead", carrying the form reference. | Easy on a phone | link in `hint` on long text questions |
| 9 | **Gloss a hard word where it appears.** Prototype, API, domain, brand guide, ad spend: one short line in plain words at first use, behind the question mark. | Nothing makes me feel slow | `tip` on those fields |
| 10 | **A real ending.** The sent screen says their name and their business, what happens next in order, and who they hear from. No number of days until the owner gives one. | A person got this | sent screen copy |

Not now: a named person who "reads every form" (needs a real name from the owner), voice recording inside the form (offered through WhatsApp instead), time of day greetings (adds nothing).

## Before and after (the words)

| Where | Before | After |
|---|---|---|
| Screen 1 title | About you | Let's start with you |
| Screen 1 blurb | Quick ones. Tap to fix anything we already have. | Four quick things, so we know who to talk to. |
| Phone | Mobile number | Your number, with: WhatsApp is fine. It is the fastest way to reach you. |
| Screen 2 title | Your business | Now, {first_name}, about {company} |
| Industry | Industry | What does {company} do? (a list) |
| Audience | Who do you sell to? | Who do you sell to? (kept) |
| Branding size | How big is the job? | How big is this job? Rough is fine. |
| Branding screen 2 | What you have, and the style | What you already have, and the look you want |
| Colours | Your colours | Colours, with: About 30 seconds. Skip it if you like. |
| Timing screen | Timing and who decides | When, and who gives the final yes |
| Sign off | Who signs work off? | Who gives the final yes? (one person, so feedback has one door) |
| What you have | What you already have | Anything you can send us now |
| Last screen | Last things | Last bits |
| Next button | Next | Next: {next screen} |
| Final button | Review | Review and send |
| Send button | Send the brief | Send to the studio |
| Dropdown placeholder | Choose one | Pick the closest |
| Optional | (optional) | Skip if you like |
| Sent title | Sent | Thank you, {first_name}. {company} is with the studio. |
