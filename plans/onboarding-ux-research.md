# Onboarding UX research: keeping clients engaged to the end

Written 7 October 2026 for the owner. Inputs read first: the six artifact data files in `plans/onboarding-artifact-specs/`, `plans/onboarding-redesign-plan.md`, `plans/onboarding-decisions.md`, `plans/onboarding-build-brief.md`, and `frontend/lib/onboarding.ts` (the shared steps and the time weights). Nothing else in the repo was changed.

## How to read this report

- Confidence ratings: **strong** means several independent sources or a standard agree. **Moderate** means a credible source or one good study, or practitioner consensus with no contradicting data. **Weak** means thin, vendor made, contradicted, or my own judgement.
- **Source quality warning.** Every external web page was blocked for direct reading (the fetch tool returned "egress blocked" for baymard.com, nngroup.com, gov.uk, web.dev, wikipedia and others). All external claims below come from web search result summaries, which quote or paraphrase the primary source. I name the primary and give the link, but I did not read the primary page myself. Re-check any number before you repeat it outside this repo. Section G lists what I could not verify.
- Where a figure is a WDC target, not a research finding, the text says "WDC target".
- Prose uses plain words, no dashes as punctuation and no semicolons.

## The headline findings (read these if nothing else)

1. **The biggest cost is not in the six service forms. It is in the two shared steps.** By the form's own time weights in `lib/onboarding.ts` (`minutesLeft`), "About you" comes to about 185 seconds and "Finishing up" to about 180 to 190 seconds. That is roughly 6 minutes before a single service question, for a client who has already paid and spoken to the team. Twelve of those questions are required (8 in "About you", 4 in "Finishing up"). The size first redesign leaves both steps untouched (decision 3 in `onboarding-decisions.md`). Fixing them saves about four of those six minutes. This is section E0.
2. **Size first is supported by the evidence, with two conditions.** Progressive disclosure and "fewer fields" are well supported. But progress feedback only helps when early progress is fast, and a bar that moves backwards when a branch opens will hurt. Ask the size question first, show the estimate after it, and credit pre-filled details as progress already made.
3. **The colour flow should lose most of its controls.** Every consumer tool I looked at (Looka, Wix, Hatchful, Namecheap, Canva, Coolors, Squarespace) starts from a mood, a ready palette, a logo or a picture, never from a colour wheel. Recommended: six "feel" cards, each showing a ready palette, confirm in one tap, or read colours from a logo or picture. Two to three taps. Removed: colour families, shade slider, editable auto name, the Like it to Love it slider, the separate first choice mark. Section D.
4. **Required questions are too many.** Plain Small Branding job today: 12 shared required plus 6 service required, about 18. A target of 8 to 10 is justified. Section B.
5. **Several owner decisions conflict with these findings** and are flagged, not silently dropped. They are collected in section E8.
6. **There is no published data on completion of paid-client intake forms in Nigeria.** All completion numbers come from cold web forms and surveys in other markets. They show direction, not size. The honest next step is to measure the first 20 real completions (section F).

---

## A. Principles, in priority order

Each principle has: evidence, source, confidence, and what it means for WDC.

### A1. Every field must change a decision, because field count drives abandonment

- **Evidence.** Baymard's 2024 checkout benchmark reports the average checkout has 11.3 form fields (down from 12.7 in 2019) and that about 17 to 18 percent of US shoppers abandoned an order in the past quarter because the checkout was too long or complicated. Baymard says most checkouts need only about 8 fields, and that field count matters more than step count. (The 2024 article gives 18 percent and its key takeaways give 17 percent, so the sources disagree slightly.) Typeform's data science team found forms with more than 6 questions had under 50 percent completion in a lead capture analysis, and Typeform's 2024 report says the highest response forms had fewer than six questions. Paperform found completion falls steadily as questions rise from 1 to 8. SurveyMonkey's 2009 to 2010 analysis of 2,000 surveys at each length found the sharpest drop off with each added question up to 15 questions, then a flatter curve.
- **Sources.** Baymard, <https://baymard.com/blog/checkout-flow-average-form-fields> (2024). Typeform Data on Data report, <https://www.prnewswire.co.uk/news-releases/new-typeform-report-reveals-how-marketers-can-drive-higher-form-completion-rates-302042004.html> (2024). Paperform, <https://paperform.co/forms-data-analysis> (2020). SurveyMonkey, <https://www.surveymonkey.com/curiosity/survey_questions_and_completion_rates/> (data 2009 to 2010).
- **Confidence.** Moderate. Direction is consistent across four sources. Size of effect does not transfer to WDC, because these are strangers filling in cold forms. Our clients have paid, so their motivation is higher.
- **Meaning for WDC.** Set a hard budget of visible questions per size (section B) and count the shared steps in it. Cut anything the quote and the first week do not need. Each question needs a one line answer to "what will the studio do differently depending on this?" The intake guides agree (<https://agiled.app/hub/agencies/client-onboarding-questionnaire>, <https://orbitforms.ai/blog/agency-client-intake-forms>), though both are practitioner opinion.

### A2. Show two to four easy questions per phone screen, one for hard ones

- **Evidence.** The GOV.UK Design System and Service Manual start from one thing per page. Reasons given: people understand the question, can focus, find their way through an unfamiliar process, use a phone, and recover from errors. It also makes autosave, analytics, branching and loops simpler. The 2015 GOV.UK design notes add that low confidence users find it easier and that it handles errors, branches and saving progress better. GOV.UK says to group only when user research supports it. Baymard notes the open touch keyboard halves the screen on mobile.
- **Sources.** <https://design-system.service.gov.uk/patterns/question-pages>, <https://www.gov.uk/service-manual/design/form-structure>, <https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/>, <https://baymard.com/blog/mobile-checkout>.
- **Confidence.** Moderate. Strong design rationale from government user research, but I found no controlled completion experiment comparing one against several questions per page. The number "two to four" is the owner's brief and my judgement, not a research figure.
- **Meaning for WDC.** Tap questions (cards, chips, yes or no) can be 2 to 4 per screen. Anything that needs the keyboard, an upload, or a judgement (colours, a textarea) gets its own screen. Never put two textareas on one screen.

### A3. Ask the easy and important thing first, and put open typing last

- **Evidence.** SurveyMonkey reports surveys that open with a simple multiple choice question complete at about 89 percent, against about 83 percent for those that open with an open ended question, and that surveys with ten open ended questions complete about 10 points lower than those with one (78 against 88 percent). Galesic and Bosnjak (2009) found answers to later questions were faster, shorter and more uniform, so quality falls as the form goes on. The foot in the door effect (small request first, big request later) is the usual theory for ordering, but replications are mixed, one 2013 direct replication found no effect, and the only online form evidence I found is a 50 student email experiment.
- **Sources.** SurveyMonkey page above. Galesic and Bosnjak, Public Opinion Quarterly 73(2), via <https://ojs.ub.uni-konstanz.de/srm/article/view/8348/7667> (a later paper citing it). Foot in the door: <https://www.atticusli.com/replication-crisis/foot-in-the-door/>.
- **Confidence.** Moderate for "multiple choice first beats open text first" (vendor data, large samples, old). Weak for "commitment and consistency raises completion" in forms.
- **Meaning for WDC.** Order: the one tap size question, then the must haves that the quote needs, then optional detail, then free text last. Do not justify the order by "commitment and consistency". Justify it by effort and by answer quality falling late in a form. Put the single most useful free text box ("Anything we have not asked?") at the very end and make it optional.

### A4. Progressive disclosure: show the common options, defer the rest

- **Evidence.** Nielsen's definition: defer advanced or rarely used features to a secondary screen, which makes the product easier to learn and less error prone. Nielsen (2006) says it improves learnability, efficiency and error rate. The risk is hiding something people need. The split between primary and secondary must be right and everything frequently needed stays on the first screen. Guides suggest no more than two or three levels.
- **Sources.** NN/g, <https://www.nngroup.com/videos/progressive-disclosure/>. Nielsen 2006 as summarised at <https://brajeshwar.com/2006/progressive-disclosure-by-jakob-nielsen-usability-expert/>. I could not open the NN/g article itself.
- **Confidence.** Moderate. Long standing, widely repeated, but the claims are largely Nielsen's own synthesis.
- **Meaning for WDC.** The size first design is a sound use of it. Three warnings. (1) The size answer is a client opinion, so a later pick must be able to raise the tier (a Small job that ticks Brand guidelines should still see colours). (2) Every question hidden at Small must be recoverable: the review screen needs "Add more detail" so no one is locked out. (3) Child questions appear directly under their parent, as the build brief already says.

### A5. Progress indicators help only when early progress is fast

- **Evidence.** Villar, Callegaro and Yang (2013) pooled 32 randomised experiments. A constant speed progress indicator did not significantly reduce drop off. Fast to slow indicators reduced it. Slow to fast indicators increased it. With a promised incentive, a constant indicator raised drop off. Conrad, Couper, Tourangeau and Peytchev (2010) found that when early feedback showed slow progress, abandonment was higher and the experience worse, and intermittent feedback limited the cost of discouraging feedback. Yan et al. (2011) reported a bar helped on a short survey and not on a long one (reported second hand).
- **Sources.** <https://research.google/pubs/where-am-i-a-meta-analysis-of-experiments-on-the-effects-of-progress-indicators-for-web-surveys/> (2013). Conrad et al., Interacting with Computers 22, 417 to 427 (2010), summarised in search results, and the related RTI paper <https://rti.org/publication/effectiveness-progress-indicators-web-surveys-front-counts>. Yan et al., <https://jpsm.umd.edu/publication/yan%2C-t%2C-conrad%2C-f%2C-tourangeau%2C-r%2C-and-couper%2C-m-%282011%29-%E2%80%9Cshould-i-stay-or-should-i-go>.
- **Confidence.** Strong that "a progress bar always helps" is false. Moderate on the fast to slow rule (surveys, not intake forms).
- **Meaning for WDC.** The code already counts three parts and minutes left, which is the right unit. Rules: make the first two screens quick taps so the bar moves fast early, never let the bar or the minutes go backwards when a branch opens (compute the estimate after the size answer and recompute only downward unless the client adds scope), and show minutes in the headline, not "Step 3 of 11".

### A6. Credit work already done (endowed progress), and be truthful about it

- **Evidence.** Nunes and Drèze (2006) gave 300 car wash customers a loyalty card needing 8 stamps, or a 10 stamp card with 2 stamps already given. Over nine months, 34 percent completed the pre stamped card against 19 percent. Effort required was identical. The effect was stronger when the customer was given a reason for the head start. Kivetz, Urminsky and Zheng (2006) found people speed up as they near a goal, including in a rating task, and that a sense of progress alone speeds them up.
- **Sources.** Wharton write up, <https://knowledge.wharton.upenn.edu/?p=5630>. Kivetz et al., Journal of Marketing Research 43(1), <https://business.columbia.edu/faculty/research/goal-gradient-hypothesis-resurrected-purchase-acceleration-illusionary-goal>.
- **Confidence.** Moderate. One field study and one set of loyalty program studies. Applying them to a form is an extrapolation. The practitioner rule "endow 10 to 25 percent" is not from the study.
- **Meaning for WDC.** Pre fill name, phone, email and business from the payment and lead record and say why: "We already have your details from your payment. Check they are right." This is real progress, not a trick. Start the bar honestly at the share of the form that is already filled. Make the last screen the easiest (the summary and Send), because people accelerate near the end.

### A7. Tell the truth about time, because stated length changes who starts

- **Evidence.** Galesic and Bosnjak (2009) varied stated length (10, 20, 30 minutes). Starts fell as stated length rose, roughly 75, 65 and 62 percent (figures reported by a later paper). SurveyMonkey reports completion falls by 5 to 20 percent once a survey takes over 7 to 8 minutes, and that people spend less time per question as surveys lengthen. Yan et al. studied promised duration against actual length.
- **Sources.** As A3 and A5. SurveyMonkey completion times page (a proxied copy was what I saw): <https://www.surveymonkey.com/curiosity/survey_completion_times>.
- **Confidence.** Moderate on direction. Weak on the exact numbers (second hand, old).
- **Meaning for WDC.** The weights in `lib/onboarding.ts` are guesses (yes or no 4 seconds, text 12, textarea 32). The artifact weights differ again (long 45, colours 60). Neither has been timed with real people. Time five to eight real clients on a mid range Android and calibrate before the estimate is shown to the public. Round up. Never show "2 minutes" unless the median is under 2.

### A8. Choose, do not type. Cut free text, and give examples where text remains

- **Evidence.** Phone text entry is slow and error prone, and selection controls (radio buttons, checkboxes, lists, pickers) work better than open text fields (Smashing Magazine, a Hong Kong government mobile accessibility handbook). Both are practitioner sources. SurveyMonkey data in A3 shows open ended questions cost completion. Material Design says helper text should be one line, and show a character counter where there is a limit.
- **Sources.** <https://www.smashingmagazine.com/2010/03/11/forms-on-mobile-devices-modern-solutions/>, <https://www.ogcio.gov.hk/en/community/web_mobileapp_accessibility/promulgating_resources/maahandbook/best_practices/maa_best_practices_2-7.htm>, <https://m2.material.io/go/design-text-fields>.
- **Confidence.** Moderate. Consensus, supported by survey data, but I found no controlled test of chips against text for intake briefs.
- **Meaning for WDC.** Convert text to chips wherever the answers cluster (section E has the list). Keep a short "Other" text under the chip. Use the site's own select for lists over ten items (repo rule), and radio style cards for five or fewer (a CXL result, second hand, says radio buttons were about 2.5 seconds faster than dropdowns, <https://formsort.com/article/how-to-design-a-dropdown-field-in-a-form/>).

### A9. Keep "I'm not sure, please advise me", but use it sparingly and read it as a signal

- **Evidence.** Mixed. Krosnick's satisficing theory says offering "don't know" lets low effort respondents skip effort, and that discouraging it gives more valid data. Critics say that for questions where people really lack the information, a "don't know" option improves confidence and data quality, and that online modes behave differently. One brand image study recommends offering it where some respondents may be unfamiliar.
- **Sources.** Krosnick, NORC methodological report, <https://amerispeak.norc.org/content/dam/gss/get-documentation/pdf/reports/methodological-reports/MR046%20Satisficing%20A%20Strategy%20for%20Dealing%20with%20the%20Demands%20of%20Survey%20Questions.pdf>. Counter view, <https://www.scinapse.io/papers/2014097054>.
- **Confidence.** Weak to mixed.
- **Meaning for WDC.** The reversible deferral is an owner rule and fits our case: a small business owner truly does not know what a "backend" or a "keyword" is. Offer it only on questions a layperson could really not know (technical, search, platform), not on name, email or what they want made. Treat a "not sure" as a flag for the call, and log the share per question. WDC heuristic, not research: if more than about 30 percent of the first 50 clients defer a question, reword it or move it to the call.

### A10. Validate late, fix early, and write errors like a polite person

- **Evidence.** Baymard found premature validation (an error shown as soon as focus enters a field) makes people feel scolded, and 31 percent of sites have no inline validation. The common rule, "reward early, punish late", is a convention: show the first error when the person leaves the field, clear it the moment it is fixed. NN/g error message guidance: readable language, precise, constructive, no blame. A third party summary of NN/g says inline validation should appear within about 500 ms after typing stops (unverified).
- **Sources.** <https://baymard.com/blog/inline-form-validation>, <https://www.nngroup.com/videos/error-message-communication-guidelines/>. Toasts are a poor place for form errors because they vanish (secondary source only).
- **Confidence.** Moderate.
- **Meaning for WDC.** The code already names the field in each error, which is good. Add: validate on leaving a field or on Next, never on focus. Be tolerant of Nigerian number shapes (0803..., +234 803..., spaces). Never block a long form on a format rule for optional fields.

### A11. Get the phone mechanics right and never ask twice

- **Evidence.** The `inputmode` attribute chooses the on screen keyboard (numeric, tel, email, url) without changing validation. Android documents autofill hints. WCAG 2.2 criterion 3.3.7 (Redundant Entry, level A) requires that information already given in the same process is auto filled or offered for selection. Criterion 1.3.5 (Identify Input Purpose, AA) uses the `autocomplete` attribute. Baymard found "Next" and "Previous" keyboard buttons are expected to move to the next logical field.
- **Sources.** <https://developer.android.com/identity/autofill/autofill-optimize>, <https://www.30secondsofcode.org/html/s/keyboard-type-using-inputmode>, <https://dequeuniversity.com/resources/wcag-2.2>, <https://baymard.com/blog/mobile-touch-keyboards>.
- **Confidence.** Strong (standards and platform documentation).
- **Meaning for WDC.** `tel` with `autocomplete="tel"`, `email`, `url`, `name` tokens, numeric keyboards for counts and money. Repeated asks are a real defect: Web asks `fixed_dates` and `inspiration` both in its service step and in the closing step (section E2), and Branding asks colours and logo upload in two places (section E1).

### A12. Show a short "here is what we heard" screen, then say what happens next

- **Evidence.** The GOV.UK "Check answers" pattern shows every answer in a summary list with a change link beside each, before submitting. It builds confidence and reduces errors. GOV.UK Forms makes this a standard step.
- **Sources.** <https://design-system.service.gov.uk/patterns/check-answers>, <https://www.forms.service.gov.uk/features>.
- **Confidence.** Moderate. Design system guidance, no completion data found.
- **Meaning for WDC.** The owner said "optional review screen". Recommend the review is always the last screen (it is also the Send screen), kept to about 10 lines with the rest folded away, each line with Change. The long version is optional, the stop is not. The quote promise is unresolved (decision 3). Separate two promises: an acknowledgement ("We have your form. A person replies on WhatsApp or email on the next working day to confirm.") and the quote time. The owner can commit to the first even if not the second.

### A13. Save every screen, resume by link, and tolerate bad networks

- **Evidence.** Typeform saves answers in the browser only (15 days, same browser and device, not private mode) and gives no resume link. Formaloo, Zoho Forms and Formie give unique resume links that work across devices, and Formaloo autosaves every 30 seconds and expires links after a month. Vendors (Dojah, Youverify) describe failed uploads and retries on weak networks as a drop off cause, with no independent numbers.
- **Sources.** <https://help.typeform.com/hc/en-us/articles/360029581051-Save-and-return-to-your-form-later>, <https://help.formaloo.com/en/articles/8394056-how-to-use-partial-submits-auto-save>, <https://dojah.io/blog/reduce-kyc-drop-off-fintech-africa> (vendor).
- **Confidence.** Weak on effect size (no return rate data found). Strong as sound engineering for this audience.
- **Meaning for WDC.** The repo already has autosave and resume tokens. Add: write each answer to the phone first and sync when the network returns, say "Saved on your phone" when the server is slow, send the resume link by WhatsApp as well as email, and warn that anyone with the link can edit (shared phones are common).

### A14. Use defaults for facts you know, never for choices the client must make

- **Evidence.** Defaults strongly shape outcomes (Johnson and Goldstein, Science, 2003, organ donation: consent rates differed by at least 60 points between opt in and opt out countries, though later work warns the story is over simplified). People mostly stay with the pre selected option.
- **Source.** <https://behavioralpolicy.org/wp-content/uploads/2020/01/Does-changing-defaults-save-lives_-Effectd-of-presumed-consent-organ-donation-policies.pdf>.
- **Confidence.** Strong that defaults bias answers. Weak for our case.
- **Meaning for WDC.** Pre fill what the studio already knows. Do not pre select deliverables, features, channels, the style route, or any engagement tick, because it would bias the brief and weaken the acceptance record. The "do you know the tools" question defaulting to No is fine because it only controls a hidden reveal.

### A15. Plain words, an example at the point of doubt, and one idea per sentence

- **Evidence.** Nielsen (2005) recommends about a 6th grade reading level for key pages and 8th grade for others, and notes lower literacy users read word by word. The same advice appears in government style guides. Material Design: helper text of one line.
- **Sources.** Nielsen 2005 summarised at <https://desis.osu.edu/seniorthesis/index.php/2021/01/25/lower-literacy-users-writing-for-a-broad-consumer-audience/>, <https://stylemanual.gov.au/user-needs/understanding-needs/literacy-and-access>.
- **Confidence.** Moderate. I could not open the NN/g original.
- **Meaning for WDC.** Put the example inside the question ("For example: lets customers book a visit and pay"), explain a technical word where it appears (already a repo rule), and avoid words like "backend", "API", "hex", "keyword" without a gloss. See section C for English and Pidgin.

### Things to NOT build on

- **The Zeigarnik effect.** A 2025 meta analysis (Ghibellini and Meier) found no memory advantage for unfinished tasks, only a general tendency to resume them. Do not write copy like "you left something unfinished". A plain resume reminder is enough. Source: <https://ideas.repec.org/a/pal/palcom/v12y2025i1d10.1057_s41599-025-05000-w.html>. Confidence moderate (I saw a summary of the paper).
- **Vendor multi step claims.** Formstack figures (about 13.9 against 4.5 percent, or elsewhere 14 percent higher) conflict, are aggregates, and are not controlled tests. Independent tests found similar rates. Multi step helps mostly on long forms. Source: <https://blog.formkeep.com/should-you-use-single-step-or-multi-step-forms/>. Confidence in the claim: weak.
- **Choice overload as a law.** Scheibehenne et al. (2010) pooled 50 experiments and found an average effect near zero. Chernev et al. (2015) found it appears when task difficulty, option set complexity, preference uncertainty and a goal to minimise effort are all high. Colour choice for a non designer hits all four. Sources: <https://ideas.repec.org/a/oup/jconrs/v37y2010i3p409-425.html>, <https://www.kellogg.northwestern.edu/faculty/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual>.
- **Colour psychology as a selling line.** Elliot and Maier's reviews say the field has weaknesses and that colour meaning depends on context. Do not tell clients "blue builds trust". Source: <https://www.frontiersin.org/articles/10.3389/fpsyg.2015.00368/full>.

---

## B. Numeric guardrails to adopt

"Basis" says where the number comes from. Many are WDC targets that need checking with real clients.

| Guardrail | Target | Basis |
|---|---|---|
| Tap questions per phone screen | 2 to 4 | Owner brief. GOV.UK one thing per page default (A2). WDC judgement for the number. |
| Hard questions per screen (textarea, upload, colours, long list) | 1 | GOV.UK (A2). Open keyboard halves the screen (Baymard mobile). |
| Time of work per screen, by the form's own weights | 30 seconds or less | WDC target. Keeps a screen to one breath. |
| Visible questions in the whole form, including shared steps, excluding pre filled ones | Small 10 or fewer, Medium 18 or fewer, Large 26 or fewer | WDC target from Typeform (over 6 questions, under 50 percent completion), SurveyMonkey (steepest drop up to 15 questions), Baymard (about 8 fields suffice). Weak transfer to paid clients. |
| Total completion time at median | Small 4 minutes or less, Medium 7 or less, Large 12 or less (Large includes optional detail) | WDC target. SurveyMonkey reports losses of 5 to 20 percent past 7 to 8 minutes. Calibrate with real timings (A7). |
| Required questions | 10 or fewer in total, and 40 percent or fewer of the visible questions, at every size | WDC target. Intake guidance: ask only what you will act on. Today a plain Small Branding job has about 18 (12 shared plus 6). |
| What may be required | Only what the quote or the first week cannot do without: who, how to reach them, what they are buying, the size, any fixed date, who approves | Intake guides (agiled, orbitforms). WDC judgement. |
| Free text boxes (textarea) in the whole form | Small 2 or fewer, Medium 4 or fewer, Large 6 or fewer, all optional except at most one | SurveyMonkey open ended data (A3). Phone typing cost (A8). WDC target. |
| Soft length of a free text answer | 600 characters, a counter, never a hard cut | Material Design counters. WDC target. |
| Options in a choice the client finds hard (colours, platforms) | 6 or fewer visible | Hick's law (decision time rises with log of options, <https://en.wikipedia.org/wiki/Hick%27s_law>, encyclopedia source). Chernev moderators (A, never as a law). |
| Options in an easy, familiar choice | 10 or fewer as chips, over 10 searchable | Repo rule (searchable above ten). Dropdown against radio notes (A8). |
| Feature checklist (Apps) | 8 "popular" shown first, 30 to 35 items in total, groups folded | WDC target. The artifact has 45 items in 10 groups. |
| Images shown on the first view of a card question | 1 per card, lazy, about 30 KB or less each | WDC target, not sourced. Branding has 11 cards of 3 images (33 images) on one screen today. |
| First screen ready to use | Under 3 seconds on a mid range Android on a slow 4G connection | Google's 2016 study: 53 percent of mobile visits are abandoned over 3 seconds (<https://thinkwithgoogle.com/consumer-insights/consumer-trends/mobile-site-load-time-statistics/>). General web, not forms. |
| Save | After every screen, on leaving a long text, and about every 30 seconds while typing | Formaloo practice (A13). WDC target. |
| Resume link life | 30 days, then a fresh link on request | Formaloo (one month), Typeform (15 days, browser only). WDC target. |
| Reminder messages | At most 2 per unfinished form, each switchable off by the person | Plan 6.5 says one after about 1 hour. The repo rule: anything we send can be switched off. No evidence on timing, so measure. |
| "Not sure" share per question | Review any question over 30 percent after the first 50 clients | WDC heuristic (A9). |
| Engagement ticks on the last screen | 4 or fewer groups, each with a short summary and "Read in full" | WDC judgement, weak evidence. Plan section 8 says one tick per section, up to 13. See E8. |
| Reading level of labels and help | Grade 6 to 8, labels about 10 words or fewer, sentences about 15 words or fewer | Nielsen 2005 (A15). The word counts are WDC targets. |
| Touch targets and spacing | 44 px, existing repo rule | Repo rule. |
| Validation timing | On leaving a field or on Next. Clear the error as soon as it is fixed | Baymard, reward early punish late (A10). |
| Review screen length | About 10 lines visible, rest folded | WDC target. GOV.UK pattern (A12). |

The form's own time weights give this reduction if section E0 is adopted. Today shared steps: about 6 minutes. After: pre filled contact card about 5 seconds, company 12, industry 7, audience 10, has logo 4, approver 12, channel 10, "anything else" 32 (optional) comes to about 90 seconds. This is arithmetic on the code's weights, not a user measurement.

---

## C. Nigeria specific adjustments

Facts first, then what each changes. Several figures conflict between sources and I say so.

| Fact | Source | Confidence |
|---|---|---|
| Android was about 82 to 83 percent of mobile web traffic in Nigeria in mid 2026, iOS about 17 to 18 percent. | StatCounter, <https://gs.statcounter.com/os-market-share/mobile-operating-system/nigeria> (May to August 2026, traffic based) | Moderate |
| In a 2025 survey of 13,251 people, smartphone penetration was 75 percent and 88 percent of smartphone users had Android apps. | KPMG and Orange, via <https://www.arise.tv/kpmg-nigerias-smartphone-penetration-climbs-to-75-as-economy-becomes-mobile-first/> | Moderate |
| Tecno 23.55 percent, Infinix 21.73 percent, itel 5.41 percent of phone traffic (about 51 percent together), Samsung 12.36, Apple 9.43. | StatCounter via <https://intelpoint.co/insights/tecno-has-the-highest-share-among-phone-brands-in-nigeria-at-23-55-as-of-february-2025/> (February 2025) | Moderate |
| Average price of 1 GB was about N575 in 2025 (N287.5 in 2024), after a 50 percent tariff rise approved in January 2025. | TechCabal, <https://techcabal.com/2025/09/01/nigeria-data-spend-721bn-monthly/> | Moderate |
| In Sub-Saharan Africa 1 GB often costs over 7 percent of monthly income, against the UN target of 2 percent. Smartphone price is the largest barrier. | GSMA, <https://www.gsma.com/somic/wp-content/uploads/2025/11/The-State-of-Mobile-Internet-Connectivity-2025-Affordability-of-Internet-Enabled-Handsets-and-Data.pdf> (2025, region level, not Nigeria) | Moderate |
| Median mobile download speed in Nigeria is reported between about 19 and 44 Mbps depending on the Ookla product and month. | <https://businessday.ng/technology/article/nigeria-slips-to-85th-in-global-internet-speed-rankings-as-peers-pull-ahead/>, Opensignal, <https://insights.opensignal.com/reports/2025/07/nigeria/mobile-network-experience> | Weak (sources conflict) |
| WhatsApp is installed on 95 percent of smartphones in the study. Meta's commissioned report says 14 million Nigerian small businesses used Meta apps in 2025. | KPMG and Orange, via <https://brandspurng.com/2026/09/26/whatsapp-installed-on-95-of-nigerian-smartphones-study-finds/>. Public First for Meta, via <https://guardian.ng/technology/meta-injects-820m-into-nigerian-economy-boosts-81-of-businesses/> (commissioned, so treat as promotional) | Moderate |
| Adult literacy is about 62 to 70 percent depending on source. English is the only official language. Nigerian Pidgin is spoken by an estimated 60 to 120 million people. | <https://www.theglobaleconomy.com/Nigeria/Literacy_rate/> (UNESCO data), <https://apics-online.info/surveys/17> | Weak (sources conflict) |
| 64 percent of Nigerians in a Visa survey acknowledge they could fall for a scam and 79 percent mostly trust digital payments. A 2026 anti scam survey says 84 percent of adults met a scam in the past year. | Visa Stay Secure (commissioned), <https://www.visa.com.ng/about-visa/newsroom/press-releases/prl-24032025.html>. GASA via <https://techeconomy.ng/trust-is-the-real-currency-of-nigerias-digital-economy> | Moderate |

### Adjustments

1. **Treat data cost as speed and failure risk, not as naira.** At N575 per GB, 1 MB costs about N0.56, so a 3 MB form load is under N2. The harm is waiting and failing on a weak signal, and for the poorest users GSMA's 7 percent figure still bites. So: no autoplay video on the onboarding path, one small thumbnail per card, lazy images, no web fonts beyond the two the site already ships, and no full page reloads between screens. Test with throttling on a Tecno or Infinix class phone with 2 to 3 GB of RAM. Moderate confidence on the principle, WDC target on the sizes.
2. **Offline tolerant saving.** Network drops and data bundles running out mid session are normal. Write answers locally first, sync later, and say "Saved on your phone" if the server cannot be reached. Uploads retry in the background and never block Next. Vendors report failed uploads on weak networks as a drop off cause (weak, vendor).
3. **WhatsApp is the front door, not an add on.** Send the resume link on WhatsApp. Put a "Talk to us on WhatsApp" button on every screen with the reference prefilled (a `wa.me/<number>?text=` link, number without a plus sign, per <https://qualimero.com/en/blog/create-whatsapp-link>). Offer "Send this by WhatsApp instead" on file uploads over about 5 MB and on long answers. The team copies the content into the entry. Confidence moderate (95 percent installed), but I found no independent data on WhatsApp handoff raising form completion. A Senegal agency blog claims 12 to 35 percent lead conversion for click to WhatsApp ads and I treat it as unreliable (vendor, no method).
4. **Voice notes for the long answers, via WhatsApp, not recorded inside the form.** Evidence for voice in Nigeria specifically is thin (WhatsApp reports about 7 billion voice messages a day worldwide in 2022 and says emerging market users lean to voice, <https://techcrunch.com/2022/03/30/people-are-sending-7-billion-voice-messages-on-whatsapp-every-day>). Research with low literacy users (Medhi, Sagar and Toyama 2007, <https://courses.cs.washington.edu/courses/cse490c/18au/readings/medhi-2007.pdf>, and the 2014 monograph, <https://nowpublishers.com/article/DownloadSummary/HCI-047>) supports voice and pictures over text, but those users were illiterate domestic workers in India, a different group from our small business owners. So voice is offered for convenience, not literacy. In form recording would add permissions, large uploads and failures, so hand off to WhatsApp. Needs a process: who transcribes a voice note into the entry, and in how long. Confidence weak.
5. **Plain English first. Pidgin only with a native editor.** English is the official language and the service forms are in English. Write at grade 6 to 8. Avoid idiom and long compound sentences. Do not machine translate to Pidgin. If Pidgin is wanted later, test with real clients and a native editor, because Pidgin has no single written standard (the APiCS survey chapter describes the variation). Use Nigerian examples inside questions (naira amounts, shop, salon, school, church, event, POS, Instagram vendor) while keeping the standing rule of no city names.
6. **Trust cues, because scam fear is high.** Show: who is behind the form (studio name, a named person who will read it, a WhatsApp number that matches the one the client already used), proof of the relationship (only if the data exists: "We received your payment, reference ...", which must come from the real record), and a plain list of what we will never ask for: passwords, PINs, OTP codes, BVN, card numbers. Put a short "Why we ask" under any sensitive question (business address, access, files). The Visa and GASA data show scam awareness is high and 82 percent of Nigerians in the Visa survey say a known brand raises trust in a payment program (commissioned, so promotional). Jumia's Nigeria leadership says pay on delivery was used as a trust tactic because customers fear being scammed (<https://stvp.stanford.edu/wp-content/uploads/sites/3/2024/09/marketplaces-operate-on-trust-transcript.pdf>). The lesson is to reduce the leap of faith, which for WDC means showing a person and a record, not a badge. I found no study of verified business badges on Nigerian forms.
7. **A person on every screen.** The owner's brief says clients prefer to talk to someone. Medhi et al. report a live operator up to ten times more accurate than a text interface for low literacy users in a health context (India, reported second hand), and GSMA treats agents as the trust interface for mobile money (<https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/blog/mobile-money-activity-rates-what-providers-can-do-to-boost-usage/>). Add one persistent control: "Prefer to talk? Tap here and we will call or message you." It saves the form, flags the entry for a person, and states a response time the studio can keep. Needs staffing. Confidence weak to moderate.
8. **Fintech and KYC lessons: ask for the least identity data, as late as possible, or not at all.** CBN rules tie identity checks to account tier (BVN or NIN for lower tiers, both plus liveness for higher), and regulators pushed back in 2024 when OPay, Moniepoint, Kuda and others were paused from onboarding new customers over weak checks (<https://techpoint.africa/2024/06/03/cbn-lifts-ban-on-new-account-opening/>, <https://guardian.ng/business-services/cbn-lifts-new-account-restriction-on-opay-kuda-others/>). Vendors claim 40 to 60 percent drop off in African KYC flows and 15 to 30 percent at the document and selfie step (<https://dojah.io/blog/reduce-kyc-drop-off-fintech-africa>, <https://youverify.co/en/blogs/reduce-kyc-drop-off-with-ai-african-digital-banks>). These are vendor claims with no method, so I treat them as weak, but all point the same way. Lessons for us: WDC needs no BVN, NIN, ID photo or selfie, and should say so. Low friction first, capped steps later is how the fintechs run tiers, and the same shape fits size first. I found no public onboarding design write up from Moniepoint, Kuda, Opay, Paystack or Flutterwave.
9. **Test devices and browsers.** Real devices: one Tecno or Infinix with 2 to 3 GB of RAM and a throttled connection, one Samsung A series, one iPhone. Opera Mini has a long record in Nigeria (Opera's own 2016 and 2023 reports, <https://african.business/2016/11/economy/opera-reaches-100-million-users-in-africa-releases-state-of-mobile-web-report-africa-2016>). I could not confirm its present share or whether its compression mode runs the form's JavaScript, so test the form there before claiming support.
10. **Shared phones and interruptions.** Resume links should not log anyone into other data, should expire, and the form should warn that anyone with the link can edit. Saving after every screen covers power cuts and calls.
11. **Naira and local tools in options.** Ad budget bands exist. Consider whether "Under N100k" is a fine enough bottom band for small vendors, which is a question for the owner's own data (decision 22 in the artifact notes already asks to revisit the bands).

---

## D. The redesigned colour flow

### D1. What the research says

- **Consumer tools never start from a colour wheel.** Looka asks for up to three colours, each with a description of what it conveys, and ships over 5,500 curated presets by mood and industry (third party reviews, <https://www.nichepursuits.com/looka-review/>, <https://www.elegantthemes.com/blog/business/looka-review>). Namecheap's logo maker picks a palette by mood, six palettes with shades (<https://www.techradar.com/reviews/namecheap-logo-maker>). Shopify Hatchful asks a business type, then style words and colour moods (<https://ecommerce-platforms.com/articles/how-to-use-the-hatchful-shopify-logo-creator>). Wix Logo Maker shows pairs of sample logos and adapts (<https://abduzeedo.com/review-wix-logo-maker-easy-simple-and-how-useful>). Wix's site editor auto builds a 9 colour palette and lets you swap a whole palette (<https://support.wix.com/en/article/wix-harmony-editor-setting-up-your-brand>). Squarespace offers pre made palettes with a custom option (<https://www.squarespace.com/blog/brand-colors>). Canva's Brand Kit pulls colours from an uploaded logo or a website and tells you to review them (<https://www.canva.com/help/brand-kit-builder/>). Coolors builds a palette from a photo and offers a spacebar "shuffle" with locks (<https://www.digidop.com/tools/coolors>). Adobe Color extracts up to five colours from an image (<https://www.computan.com/blog/adobe-color-tool-a-must-use-tool>). Notion offers ten named colours (<https://matthiasfrank.de/en/notion-colors/>).
- **Names beat codes for non designers.** Heer and Stone (CHI 2012) built colour selection from large scale human naming data and found colours cluster around a small set of basic names (<https://idl.uw.edu/papers/color-naming-models>). The xkcd survey of about 200,000 people named colours freely (<https://blog.xkcd.com/2010/05/03/color-survey-results/>). Not tested as a form control.
- **Few options, and a fast default.** Choice overload is not a law but colours hit its four moderators (A, "Things to NOT build on").
- **Not covered.** I did not research Figma, Webflow or the Adobe mobile apps, so I make no claim about them. Tailor Brands' colour step could not be confirmed (the review I found stopped before it). Agency intake forms usually ask for three adjectives plus example logos (Digimax, <https://forms.digimax.dental/core-branding-questionnaire/>) and five words for brand essence (Manyrequests, <https://manyrequests.com/blog/branding-questionnaire-for-clients>). Nobody compares three against five, so "three words" is convention.
- **Extraction caveat.** Canva's extracted colours are not always the exact brand hex, and several logo variants can give several palettes. Colour extraction should drop transparent pixels, ignore a flat white or black background, and let the person delete a swatch. Color Thief (median cut) is a common choice (<https://lokeshdhakar.com/projects/color-thief/>), but this repo already has `lib/color-quantize.ts`, a pure bucket counting function that ignores transparent pixels. It is currently used server side by `lib/brand-kit.ts` (with sharp). Because it takes a plain pixel buffer, the same function should be usable in the browser from a canvas, so a logo can be read on the phone without uploading it first. This needs an engineer to confirm.

### D2. The flow, in order

Only the first screen is compulsory to see. The whole thing is optional, and "Skip for now" is always there.

**Screen C1. The feeling**

- Heading: `Your colours`
- Time line: `About 30 seconds. You can skip this.`
- Question: `What should your brand feel like?`
- Help under the question: `Tap the one that is closest. We will suggest colours to match. You can change them later.`
- Six cards, each is one radio choice, 44 px or taller, a strip of four swatches on top, the name in bold, one plain line under it, and every swatch also has its name in text for people who cannot tell the colours apart:

| Card name | Line under it | Swatches (illustrative first palette, the studio sets the final ones) |
|---|---|---|
| Warm and friendly | Welcoming, like a good neighbour. | Sunset orange #E8741E, Sand #F4E3C8, Cocoa #5A3A27, Cream #FFF8EC |
| Calm and trusted | Steady, clear, reliable. | Deep navy #14284B, Sky blue #5B9BD5, Mist #E6EEF7, Slate #3E4C59 |
| Bold and energetic | Loud, quick, hard to miss. | Strong red #D62828, Black #111111, Sun yellow #F7B500, White #FFFFFF |
| Fresh and natural | Clean, healthy, growing. | Leaf green #2E7D4F, Lime #A7C957, Cream #F6F1E1, Bark #4A3B2A |
| Rich and premium | Smart, polished, high end. | Black #0F0F0F, Gold #C9A227, Ivory #F7F1E3, Wine #5E1A2B |
| Bright and playful | Fun, young, full of life. | Hot pink #E83E8C, Purple #6F42C1, Teal #1FB5A8, Lemon #FFE066 |

- Below the cards, two quieter choices in a row (same radio group):
  - `I already have my colours`
  - `Choose for me`
- Below that: the standard reversible `I'm not sure, please advise me`, and a text button `Skip for now`.
- Reasoning: six cards stays inside the range where a hard choice is tolerable, the cards give the answer as pictures and words, and none of the copy claims a colour has a psychological effect.
- The hex values above are my illustration. They were not tested. The studio designs three palettes per card (18 in total) so that "Show me another" has something to show, and checks every swatch pair for contrast. None of the illustrative colours uses the bright site orange as text.

**Screen C2. The suggestion (after tapping a feeling)**

- Heading: `A palette for "Warm and friendly"` (the card name is inserted)
- Four large swatches with names under them. The first swatch carries a badge: `Main colour`.
- Line: `The main colour is the one people will remember you by. Tap any colour to make it the main one.`
- Primary button: `Yes, use these`
- Secondary button: `Show me another` (shows `1 of 3`, `2 of 3`, `3 of 3`, then goes back to the first)
- Quiet text button: `Change a colour or add my own` (goes to the optional deeper path, C4)
- Foot line: `These are starting points. Your designer will fine tune them with you.`
- Result: two taps for a typical client (a card, then Yes). Three if they ask for another palette.

**Screen C3. "I already have my colours" (one question, three ways, pick one)**

- Heading: `Show us your colours`
- Option 1: `Upload my logo or a picture` with help `We read the colours from it.` Opens the phone file chooser (image files only). After the file is chosen, show: `We found these colours`, up to five swatches with names, each with a 44 px remove button labelled `Remove Dark green`. First swatch is `Main colour`, tap another to change. Buttons: `Use these colours` and `Try another picture`. If a flat white or black background was ignored, say so in one line: `We ignored the white background.` If the logo is the file chosen, it is attached to the form as the logo, so the client is not asked for it again.
- Option 2: `I know my colour codes` with help `A code looks like #1A5C3A.` Up to five rows. Each row: a field labelled `Colour 1` (then `Colour 2`) with placeholder `#1A5C3A`, a live swatch beside it, a remove button, and `Add another colour` until five. The `#` is optional. Error text: `That code needs 6 letters or numbers, like 1A5C3A. Check it and try again.`
- Option 3: `Describe them in words` with a single text box, placeholder `For example: dark green, gold and white`. Help: `We will turn these into exact colours and show you before we use them.`
- Always visible: `I'm not sure, please advise me`.

**Screen C4. The optional deeper path (behind "Change a colour or add my own")**

- Shows the current swatches (up to five). Tap a swatch to change it, tap `Add a colour` for another, tap the star or `Make this the main colour` to move the main badge.
- Changing a colour opens the site's bottom sheet with: eleven name chips (`Red`, `Orange`, `Yellow`, `Green`, `Blue`, `Purple`, `Pink`, `Brown`, `Grey`, `Black`, `White`), one tap each, each giving one good standard shade. Under them, a single field `Or type an exact code`. The free picker (saturation area, hue slider) is deferred and not part of version one.
- One quiet line at the bottom for ideas, `Need ideas? Pinterest, Dribbble and Coolors are good places to look.` with three links that open in a new tab. This keeps the owner's plan 2 wish but pushes it out of the main path, because it sends the client to heavy sites on paid data. See conflict E8.

**Screen C5 (only for "Choose for me")**

- No further questions. Confirmation line: `Good. We will choose colours that fit your business and show you before we use them.` The `Skip` path does the same silently, with the source marked as skipped.

### D3. What is stored

| Key | Value | Notes |
|---|---|---|
| `brand_vibe` (new) | One of the six card names, or `Not sure`, or empty | This is the vibe word the studio wants. |
| `brand_colours` (existing) | Up to five lines in the existing three part format: `Name \| #HEX \| Role`, under the existing heading `Colour preferences:`. The lead colour has the role `Main colour (primary)`. All others have `Not decided`. | Fully compatible with `parseColours`, `colourProblem`, `COLOUR_ROLES` and every admin reader today. No change to `brand-colours.ts` or `scripts/check-brand-colours.mjs`. |
| `brand_colour_source` (new) | `vibe`, `logo`, `picture`, `codes`, `words`, `studio`, or `skipped` | One short text so the studio knows how much to trust the hex values. |
| `brand_colours_words` (new, only for the words path) | The client's own text | The studio converts to hex. |
| Logo or image | The existing `logo_files` upload | A logo chosen in C3 is attached here. A non logo picture is read on the phone and not uploaded unless the client also attaches it as a reference. |

Decision 15 proposed `Name | #HEX | Role | like N | first`. This design does not need the like and first parts, because the main colour is carried by the existing role value. If any code for decision 15 is already written, it can stay inert and unused. Names for swatches are computed from the existing colour name table, shown read only, and never asked of the client.

### D4. What is removed from today's colour flow

| Removed | Why |
|---|---|
| Colour family tabs (nine families) as the main route | Needs colour judgement that non designers lack. Replaced by feelings and named chips. |
| Shade slider | Same reason. A client who cares about exact shades uses the code field. |
| Editable or prominent auto colour name | The name is still computed, but only as a read only label. No decision for the client. |
| "Like it to Love it" slider on every colour | Doubles the controls per colour. Order and the main colour mark carry the same information with far less effort. |
| Separate "First choice" control | Replaced by tapping a swatch to make it the main colour. Same data, one gesture. |
| Role dropdown | Already removed in plan 2. Stays removed. |
| Pinterest, Dribbble and Coolors links on the main screen | Moved to one quiet line inside the deeper path. See E8. |
| The free text "Your brand colours" box in the shared closing step | It duplicates this flow in all six forms. See E1 and E0. |
| HeroUI ColorPicker and the plain code free picker for version one | Deferred. The hex field and name chips cover the need. Reconsider if the studio finds clients cannot reach a colour they want. See E8. |

### D5. What remains

Up to five colours. Hex entry. One main colour. Reversible "not sure". 44 px targets. White swatches keep a visible edge (existing rule). Swatches always show their name as text. The studio keeps its own sort into primary, secondary, accent, text and neutral, computed when read (plan 6.2 item 7), using the main colour first and then list order, instead of the like score.

### D6. What the studio sorts out later

Roles (primary, secondary, accent, text, neutral). Exact shades and tints. Contrast pairs so text is readable on each colour. Dark theme versions. Print values (CMYK or Pantone). Final names. Resolving a words only answer into hex. Reconciling extracted colours with an existing brand guide. Showing the client the proposed palette before it is used.

### D7. Tap count and time (estimates, not measured)

- Client with no colours: 2 taps (card, then Yes), about 10 to 20 seconds. The form's own weight for the old colour step was 60 seconds.
- Client with a logo: 3 taps plus the phone's file chooser (I already have colours, Upload, Use these colours), about 20 to 40 seconds.
- Client who wants exact codes: 3 taps plus typing 6 characters per colour.
- Skip or "Choose for me": 1 tap.
- Calibrate with five to eight real clients on a mid range Android.

### D8. When to show it

It appears at every size when the deliverables include Full identity system, Brand guidelines, Flyers or Social templates (the existing condition). Today the artifact makes it tier 2, so a Small job that ticks Brand guidelines never sees it. Make the colour screen follow the deliverable, not the size. For the other five services, offer it only when the client has no logo to upload, as a compact version of C1 and C2 (see E0 and E2 to E6).

---

## E. Concrete changes for each form

Reading notes. "Today" means the artifact specs in `plans/onboarding-artifact-specs/`. Counts are mine from those files and are always visible questions excluding the size question: Branding 5/5/6 for Small/Medium/Large, Web 5/8/10, SEO 5/8/9, Apps 4/7/11, Software 4/7/11, Social 4/7/12. Each also opens one to four conditional follow ups. Required questions inside the service step today (at Small): Branding 6, Web 4 to 5, SEO 6 to 7, Apps 3, Software 2, Social 3 to 5. The shared steps add 12 required.

### E0. Shared steps (all six forms), the largest single saving

Source: `frontend/lib/onboarding.ts`. Not in the artifacts, and decision 3 says leave them. I recommend reopening it, because 6 of the roughly 7 minutes a Small job takes are here.

**About you (11 visible questions, 8 required, about 185 seconds by the code's weights)**

| Question | Change | Reason |
|---|---|---|
| First name, Last name, Mobile, Email, Business name | Pre fill from the payment and lead record and show as one card: `Is this you? Tap to fix anything.` | The client has paid and spoken to the team. WCAG 3.3.7. Endowed progress (A6). Saves about 60 seconds. Assumes the record holds these fields, which I could not verify. |
| Business address (textarea) | Cut from this step. Ask later only if invoicing truly lacks it. | Typing an address is slow on a phone, a trust question ("why do you need my address?"), and an invoice already exists. Owner to confirm it is needed. |
| "Briefly describe your company" (textarea, required) | Make optional, move after the work questions, add the example inside the box. Offer a WhatsApp voice note. | Heavy typing first. The team heard this on the call. Required status is the problem. |
| Industry (12 options) | Keep. | Quick one tap. Already searchable. |
| "What makes you the one they should pick?" (textarea) | Move to Large only. | Hard open question. Branding and Social can cover it on the call. |
| Primary audience (multi) | Keep, 1 tap. | Cheap and useful. |
| Age range (multi, 8 options) | Medium and Large only, shorten to 4 bands. | Rarely changes the quote. |

**Finishing up (about 11 visible questions, 4 required, about 180 to 190 seconds)**

| Question | Change | Reason |
|---|---|---|
| Do you have a logo? (required) plus upload plus "Would you like us to design one?" | Keep as one question with the upload under Yes. Make it optional. For Branding merge into "What do you have today?" (E1). | One concept, three controls today. |
| Do you have a brand book? (required, cards) plus upload plus offer | Medium and Large only, optional. For Branding merge as above. | Jargon ("brand book"), low value at Small. |
| "Your brand colours" (free text) | Replace with the new colour flow or drop for non Branding services. | Duplicates D. Typing colour names is the confusing part. |
| "Two or three examples you like" (textarea) | Large only. For Branding already moved. | Heavy typing. |
| "Anything else we should have" (upload) | Keep, optional. | Cheap. |
| Who signs work off (required, text) | Keep. One question. | Owner decision 5. |
| Anyone else who needs to see things (textarea) | Large only. | Rarely needed to start. |
| Fixed dates (textarea) | Show only if timing says a set date. Web currently asks this twice (E2). | Duplicate and conditional. |
| Channels for updates (required, multi) | Keep, as chips, include WhatsApp first. | This is the WhatsApp handoff. |
| Anything we have not asked (textarea) | Keep as the last optional box, add a voice note option. | The code's own comment calls it the most useful box. |

After these changes the shared steps are about 90 seconds and 4 required questions (name card confirm, phone or email on file, approver, channel), by the form's weights.

### E1. Branding & Design

Today (Size first): size, deliverables (11 cards, 3 images each), deliverables other, motion kinds, job rhythm (+ batch count, monthly count, recurring kind), deadline (+ fixed dates), what exists today (+ must not change, logo upload), style route (+ links, files, directions, notice), colours, places, supplied assets, voice, personality, layouts, avoid. Plus the closing step asks logo, brand book, brand colours.

| Question | Action | Reason |
|---|---|---|
| Size ("How big is the job?") | Keep as the first tap. Let a later pick raise the tier. | Matches progressive disclosure. A Small job that ticks Full identity should still reach colours and guideline questions (A4). |
| Deliverables cards | Keep. Show 1 image per card, lazy, small. Remove "Clip pending" tiles from Motion design until real clips exist. | 33 images on one screen is a load risk on weak networks. Dead "pending" tiles are untrustworthy. |
| Deliverables other (text) | Merge into the "Something else" card as an inline field. | One fewer question slot. |
| Motion kinds (multi with its own "not sure") | Keep as chips. Drop the inner "not sure" chip and use the standard reversible one. | One deferral control, not two. |
| Job rhythm (3 options, required) | Ask only when Flyers, Social templates or Promotional branding is picked. | The plan ties it to small repeatable jobs. A logo client does not need "one piece, a batch or monthly". |
| Batch count and monthly count (number, required) | Convert to chips: 1 to 3, 4 to 10, 11 to 20, More than 20, Not sure. Make optional. | Typing a number is slower than a tap, and the exact count can come later. |
| Recurring kind (multi) | Cut. | Repeats the deliverable cards. Edge cases (ad pictures, short videos) go in "Something else". |
| Deadline (4 options, required) | Keep. | Quote needs it. |
| Fixed dates (long) | Short text, only for "set date" or "within two weeks". | One line is enough. |
| What exists today (required) plus Must not change plus Logo upload, plus closing "Do you have a logo", "Do you have a brand book" and their uploads | Merge into one question: `What do you already have?` chips: `A logo`, `Our colours`, `A brand guide`, `Nothing yet`. Each chip opens its upload under it. | Three overlapping questions and the same upload key (`logo_files`) asked in two places. |
| Must not change (long) | Large only. | Call topic. |
| Style route (3 cards, required) | Keep the approved copy. Make it optional. If skipped, treat as Suggest for me, no directions, and say so on screen. | Required today. A skipped answer should not block. |
| Style links and Style files | Keep optional. One link field, up to three. Accept social handles. Add `Send them on WhatsApp instead`. | Typing several links on a phone is painful. |
| Style directions (yes or no) and the approved reassurance copy | Keep. Owner decision 8 also shows it for "A bit of both". | Owner copy is approved. |
| Colours | Replace with section D. Remove the closing step's separate brand colours box for Branding. | The reason for this report. |
| Places the logo is used (multi, 8) plus other | Large only, chips, no separate other field. | Studio knows from deliverables. |
| Supplied assets (fonts, pictures, music) | Large only, and add a licence tick at submit. | The question is mostly legal cover, not scope. |
| Voice (4 options) | Large only, keep. | Cheap. |
| Personality words (multi, 8) | Large only, pick up to 3. Fold into the vibe from D for Branding. | Agencies ask for three words (convention). |
| Layouts (multi, 6) | Cut. | Settle on the call or in the guide. |
| Avoid (long) | Keep as last optional on Large. | Useful and optional. |
| Required | size, deliverables, deadline, what you have. Cut job rhythm and style route from required. | Four required, down from six. |

Result: a Small job is size, what we are making, timing (with rhythm if a flyer or template), what you have, style route, colours. Six questions, five to six screens, about 2 minutes of service work.

### E2. Web

Today: 30ish questions with 8 follow ups for the "what should the site do" cards.

| Question | Action | Reason |
|---|---|---|
| Size (simple, bigger, large) | Keep, and drop the later page count at Small and Medium. | Size already says pages. |
| Page count (4 ranges) | Large only, or cut. Old values still read. | Duplicates size. |
| New or existing (required) | Keep. | Quote driver. |
| Current URL (required if existing) | Keep. | Needed. |
| Likes and dislikes (long) | Large only. | Call topic. |
| Free review (yes or no) | Keep. | Owner decision. |
| What should the site do (7 cards, required) | Keep. | Core question. |
| Follow ups: items to sell, payment note, payment providers, own provider | Keep items and providers, fold "own provider" into the provider chip with an inline field. | One fewer question. |
| Follow ups: what is booked (text), pay at booking | Convert "what is booked" to chips (Appointments, Tables, Classes, Rentals, Other). Keep pay at booking. | Typing to choosing (A8). |
| Follow up: pieces of work to show | Medium and above. | Detail. |
| Follow up: how people get in touch (4 options) | Cut. Make a contact form and a WhatsApp button the standard and say so. | Low value, and WhatsApp is the norm here. |
| Follow ups: what members get (long), how they join | Large only. | Heavy and rare. |
| Words and pictures (required, 3 options) plus what you need from us (3 options) | Merge into two quick rows: words (`I have them` or `I need help`) and pictures (same). Keep the scope line. | Two questions about one topic. |
| Deadline (required) plus fixed dates | Keep deadline. **Fixed dates is asked again in the shared closing step with the same key.** Remove one. | Duplicate question. |
| Extra features (9) plus other | Medium and above. Remove items already covered by the cards (gallery). | Overlap with "what should the site do". |
| Domain and hosting: has hosting (required), details, domain ideas, studio buys | Make has hosting optional with plain wording: `Do you have a website address (a domain)?` Yes, No, Not sure. Keep details (no passwords hint stays) and the existing domain check. | Jargon, and "not sure" is a common true answer. A required jargon question blocks people. |
| Should we optimise it for search (yes or no) | Cut from the default path. Show one notice: `Search work is its own service. We can quote it separately.` | Selling a second service inside an onboarding form after payment. Owner decision 11 in plan 14.4 kept it optional, so this is flagged in E8. |
| Sites you like (links) | Large only. **Also asked in the closing step with the same key.** | Duplicate question. |
| I already know what I want (hidden reveal) | Keep, hidden. | Owner decision. |
| Required | New or existing, what the site does, words and pictures, deadline. Four. | Down from five or six. |

### E3. SEO

Today: about 14 questions. Already the shortest service step, so size first adds little. Keep the size question for consistency but the gain is in merging.

| Question | Action | Reason |
|---|---|---|
| Has a website (required) plus URL (required) | Merge into one: `What is your website address?` with a chip `I do not have one yet`. | One question, not two. |
| Customers (4 cards, required) | Keep. | Plan item. |
| Which areas do you serve (text, required if local) | Optional, with chips `Nationwide` and `Just near us` and an inline field. | Required typing is a block. |
| Google Business Profile (3 options) plus Search Console (3, required) plus Analytics (3, required) | Merge into one: `Which of these do you have?` chips: `Google Business Profile`, `Google Search Console`, `Google Analytics`, `None of these`, `Not sure`. Optional. | Three jargon questions become one tap. Plan 2 says ask only whether they have Search Console and Analytics, a merged multi respects it. The artifact moved Business Profile to its own question, which this reverses. |
| What kind of businesses buy from you | Cut or Large. | Call topic. |
| Goals (5 cards, required) | Keep. | Owner item. |
| Time frame (3, 6, 12, not sure, required) plus the 3 month notice | Keep. | Owner item. |
| What should someone type into Google (long, required) | Make optional with the not sure option as a normal answer. Placeholder: `For example: wedding photographer near me`. | The single hardest question for a layperson, and not sure is valid anyway. |
| Who writes your content (4, required) plus would you like us to write it | Merge: one 4 option card where `I would like WDC to` carries the scope line. Medium and above. | Two questions, one idea. |
| Competitors (long) | Large only, up to three short names or links. | Plan says keep, shorter. |
| Required | Website address, customers, goals, time frame. Four, down from six or seven. | |

### E4. Apps

Today: 17 questions. Small is already short: where used, stage, main job, features.

| Question | Action | Reason |
|---|---|---|
| Early notice about what we do not build | Keep (owner), one calm line at the top. | Plan item. |
| Where will people use it (multi, required) | Keep. | Quote driver. |
| Stage (4 options, required) and its follow ups | Keep. Make "where can we see it" a single URL or short text. | |
| Main job in one sentence (required) | Keep, with the example. Add `Say it by WhatsApp voice note instead.` | The most valuable sentence in the form. |
| Feature checklist (45 items, 10 groups, searchable) | Show 8 popular items first and `See all features` for the rest. Trim to about 30 to 35 items: merge the sign up family into one, merge email and SMS alerts and reminders, merge import and export, drop Dark mode, Password reset, Share to other apps, Recommendations. | 45 items hits all four choice overload moderators. Still searchable. Keep the checklist (owner). |
| Prototype first notice | Keep. | Plan item. |
| Who uses it and what each may do (textarea) | Convert to chips (Customers, Staff, Owner or admin, Drivers or agents, Vendors, Other) plus an optional line. Medium and above. | Hard open question for non technical clients. |
| Must it work offline (3 options) plus which parts (textarea) | Keep the 3 options, cut the textarea. | Call topic. |
| What must it connect to (textarea) | Chips of common tools (WhatsApp, Paystack, Flutterwave, Google Sheets, accounting software, a database I have, Other, Not sure). | Typing to choosing. |
| Store accounts (3 options) plus "set up the missing ones" | Keep (owner kept them). Merge the second into a scope line. | |
| First year users (4) | Large only. | |
| Personal information the app holds (textarea) | Chips (Names and phones, Payment details, Photos, Location, Health, Other). Large only. | |
| Backend exists (2) | Large only, keep. | |
| Do you know the tools, tools, other tool | Keep as a hidden reveal. Drop the separate other field (the Other chip). | Owner item. |
| Required | Where, stage, main job. Three. Keep. | Already within the guardrail. |

### E5. Software and AI

Today: 16 questions. Few required (2) but the heaviest typing of the six.

| Question | Action | Reason |
|---|---|---|
| What slows your team down, or the idea (textarea, required) | Add 5 pain chips above it (copying data between tools, answering the same questions, slow approvals, reports by hand, tracking orders or stock, something else). The text is optional extra. Offer a voice note. | Typing the biggest question on a phone is the main drop risk. |
| Show us what you have (upload) | Keep, optional. Add `Send big files on WhatsApp`. | Owner wants this. 25 MB limit is a weak network risk. |
| Kind of help (6 cards, required) | Keep. | Plan 7.5 names the cards. |
| Which tools must it connect to (textarea) | Chips of popular tools plus a write in box. Keep the API note. | Plan says the client writes the list, a write in box still does. |
| AI data rules (textarea, shows for AI, now also automations and pipelines per decision 12) | First 4 chips (Data must stay in Nigeria, Only some staff may see it, No special rules, Not sure) then an optional line. | Collects the owner's terms with less typing. |
| Demo notice | Keep. | |
| How many people use it, where does the information live (6), what number shows it worked | Keep users and data home. Convert the number to chips (Save time, Fewer mistakes, More sales, Better reports, Other) plus an optional line. Medium. | |
| Walk us through how the work is done today (textarea) | Move to the call or a WhatsApp voice note. Cut from the form. | The heaviest question in the six forms. |
| Regulation or data rule (textarea) | Merge into the AI data rules question. | Overlap (the artifact already asks this). |
| Should a person check the AI (3) | Keep for AI. | Cheap. |
| Seen something you liked (textarea) | Cut. | Call topic. |
| Know the tools, which tools | Hidden reveal. | |
| Required | What slows you down (or pick a chip), kind of help. Two. Keep. | |

### E6. Social Media and Paid Ads

Today: 22 questions. Large has up to 7 textareas.

| Question | Action | Reason |
|---|---|---|
| Packages (3 cards, required) | Keep. | Owner item. |
| Platforms (11 chips, required) | Keep. | |
| Paste your links (textarea) | Keep as one box. Accept handles. | Owner decision. |
| Ad budget (4 bands, required if ads) | Keep, reword: `How much will you spend on adverts each month? This is paid to Meta or Google, not to us.` Owner to revisit the bands. | Owner item, jargon in "media budget". |
| Do you have accounts (required) plus access (required) | Merge into one question with four answers: `I have them and can add you`, `I have some, please help with the rest`, `I do not have them, please set them up`, `Please work through me`. | Two required questions that are one decision. |
| How we work notice | Keep. | Plan item. |
| Main result (6 chips) | Keep. Medium. | |
| Who approves posts plus how fast | **Remove "who approves".** Decision 5 says Social asks only how fast, but the artifact data still has the approver question. | The artifact is stale against decision 5. |
| Report frequency (3) | Keep. | |
| What counts as success (textarea) | Keep as an optional short line with examples. | Plan item, but hard to answer. |
| Past results (textarea) plus screenshots | Keep optional. Screenshots Large. | |
| Kinds of content (9 chips) | Keep Large. | |
| Keep coming back to, stay away from, admired accounts, upcoming launches (4 textareas) | Merge into one optional box: `Anything to keep, avoid or plan around?` | Four textareas at the end of the form. |
| Required | Packages, platforms, account route, ad budget if ads. Four, down from three to five. | |

### E7. Cross-form: engagement section

Plan section 8 asks for a tick for each section plus a typed full name, up to 13 headings, in every form. It is behind a flag until a lawyer reviews it. Reading and ticking 13 sections on a phone at the end of the form is the heaviest single screen in the journey, and it comes where people are tired but near the goal. I found no data on this screen. Recommend grouping to 4 ticks (what we do and what you give us, money and ownership, what we cannot promise, ending and law), each with a two line summary and `Read in full`. Flagged in E8 because it changes owner text.

### E8. Conflicts for the owner (not silently dropped)

| # | Owner requirement | What the research suggests | Recommendation |
|---|---|---|---|
| 1 | Plan 2 Colours: slider from Like it to Love it, first choice mark, colour families and shades | Too many controls for non designers (D) | Replace with section D. The owner's own brief says the flow is too confusing. Please confirm. |
| 2 | Plan 2 Colour help: links to Pinterest, Dribbble, Coolors | Sends clients out of the form, to heavy sites, on paid data | Keep as one quiet line in the deeper path (C4). Please confirm. |
| 3 | Decision 14: free colour picker in plain code | Not needed for version one | Defer. |
| 4 | Decision 15: storage `Name \| #HEX \| Role \| like N \| first` | Like and first are no longer asked | Keep the existing three part format with `Main colour (primary)` as the role of the lead. |
| 5 | Decision 3 and plan 14.4 item 3: shared steps untouched | They hold about 6 of the roughly 7 minutes of a Small job | Reopen. Section E0. This is the largest single gain. |
| 6 | Plan 14.4 item 11: Web keeps `wants_seo` optional | Sells a second service inside onboarding | Cut or replace with a notice. |
| 7 | Plan 7.5: Software type cards and "tools list the client writes in" | Fine, but typing is the main risk | Keep the cards and the write in. Add chips above them, not instead. |
| 8 | Plan 7.2 and artifact: Business Profile separate from Search Console and Analytics | Three jargon questions | Merge into one multi (compatible with the plan). |
| 9 | Plan 2 and 6.3: style help copy | None | Keep as approved. Just make the question optional. |
| 10 | Plan 8: one tick per engagement section, 13 headings | Heavy at the end | Group to 4 ticks, lawyer to approve. |
| 11 | Plan 14.4 item 2: quote timing unresolved | Uncertainty about "what happens next" hurts trust | Promise an acknowledgement time now (`A person replies on the next working day to confirm we have your form`), and the quote time when known. |
| 12 | Decision 4 and the closing step: Web keeps fixed dates and inspiration in both places | Same key asked twice | Fix: add `notFor: ["web"]` to the closing copies or remove the Web copies. |
| 13 | Branding closing step: has logo, brand colours, logo upload also stay | Duplicates what the service step now asks | Remove the duplicates for Branding (E0 and E1). |
| 14 | Social artifact still holds `approver`, decision 5 removed it | Stale data | Remove from the Social spec. |

---

## F. Checklist for all six forms

Tick each before a form ships.

- [ ] The size question is the first tap. The time estimate appears right after it, in minutes, rounded up, and only goes down unless the client adds scope.
- [ ] "About you" is pre filled from the payment and lead record and shown as one confirm card. Pre filled progress is counted honestly and the reason is stated.
- [ ] The first two screens are quick taps.
- [ ] 2 to 4 tap questions per screen, 1 for any textarea, upload or colour screen.
- [ ] Visible questions stay within the budget for the chosen size (section B). Required questions are 10 or fewer and carry a one line reason in the spec.
- [ ] Every optional question says `Optional`. Required ones say why in one line if not obvious.
- [ ] Hidden follow ups appear directly under their parent, and a later pick can raise the tier. No question is asked twice (check shared keys).
- [ ] Free text has an example inside the question and a voice note or WhatsApp alternative. Chips come before text.
- [ ] `I'm not sure, please advise me` only where a layperson could truly not know. Reversible. Logged per question.
- [ ] Right keyboard and autofill tokens on name, phone, email, url, numbers. Validation on leaving a field or on Next. Errors name the field and say how to fix it.
- [ ] Autosave after every screen, local first, sync when online, "Saved on your phone" if the server is slow. Resume link by WhatsApp and email. Link life 30 days. Warning about shared phones.
- [ ] A "Talk to a person" control on every screen that saves the form and raises a flag with a promised response time.
- [ ] A WhatsApp button with the form reference prefilled.
- [ ] Trust strip: studio name, a named person who reads the form, proof of payment only if it is real data, and "We never ask for passwords, PINs, OTP codes, BVN or card numbers".
- [ ] A "Why we ask" line under address, access and file questions.
- [ ] Last screen is a short "Here is what we heard" (about 10 lines, folded detail, Change on each line) that is also the Send screen. It states what happens next in order and the acknowledgement time.
- [ ] The engagement section, when its flag is on, is 4 grouped ticks with a typed name.
- [ ] Reminder messages: at most two, each switchable off by the client.
- [ ] Performance: first screen usable in under 3 seconds on a Tecno or Infinix class phone over throttled 4G. One small image per card. No video on the path.
- [ ] Copy at grade 6 to 8, no jargon without a gloss, no city names, no dashes or semicolons, one body colour.
- [ ] After launch, record: completion rate by size, time per screen, drop off by screen, "not sure" share per question, and the first 20 real completion times. Calibrate the estimate from those.

---

## G. What I could not verify, and blocked sources

**Blocked.** The fetch tool returned "egress blocked" for every external page I tried: baymard.com, nngroup.com, design-system.service.gov.uk, www.gov.uk, web.dev, wikipedia.org, smashingmagazine.com. All external claims therefore come from web search result summaries. I could not read any primary source page, so I cannot confirm exact wording, sample sizes or figures in them.

**Primary source not read, relied on a secondary summary.**
- NN/g articles on progressive disclosure, required fields, error messages, mobile forms and lower literacy users (I saw video pages and third party summaries only). The "500 ms" inline validation figure is third party and unconfirmed.
- Luke Wroblewski's Web Form Design book. I saw only his slides and a secondary account of the 2006 Penzo eye tracking test (four forms of four fields, a small test). Not used as a principle. Label placement is a minor point for a one column form that already exists.
- Baymard: field count, inline validation and keyboard articles came as search summaries. The checkout complexity abandonment figure is 17 or 18 percent depending on the page. I could not confirm anything about sticky buttons. A search snippet claimed a "22 percent lift from sticky CTAs" from an unnamed 2024 Google benchmark, which I could not find and did not use.
- Galesic and Bosnjak (2009): start rates (about 75, 65, 62 percent) come from a later paper citing it.
- Yan et al. (2011) result is reported second hand. Conrad et al. (2010) is a summary. A blog claim of about 6 percent lower completion with progress bars in Conrad's work is a secondary account I did not use.
- Nunes and Drèze (2006): figures from Wharton and a trade summary. I did not open the paper.
- The Ghibellini and Meier (2025) Zeigarnik meta analysis figures (59 studies, d of 0.15) came from secondary coverage and I did not use them.
- Defaults: I did not verify the 4.25 and 99.98 percent figures sometimes quoted. I used only the 60 point gap statement from a review.

**Not found at all.**
- Any published completion or abandonment data for post sale client intake forms, or for any Nigerian small business form. Every completion number is from cold web forms or surveys.
- Published data from Formbricks, Tally or Jotform on completion by length. Typeform, Paperform and SurveyMonkey figures are used instead.
- A HubSpot or Unbounce controlled test of multi step against single step. Only vendor claims exist and they conflict.
- Dubsado and HoneyBook questionnaire guidance. Intake advice came from Agiled, Orbitforms and Digimax templates, all practitioner sources.
- Stripe's onboarding design (no source), and Linear, Notion and Intercom only through third party teardowns (<https://candu.ai/blog/how-notion-crafts-a-personalized-onboarding-experience-6-lessons-to-guide-new-users>, <https://www.culturaldaily.com/how-notion-and-stripe-redesigned-their-ux-flows-as-they-scaled-and-what-growing-teams-can-take-from-it/>). They show the pattern of one or two identity questions then a tailored start, with optional steps skippable, but are not evidence of effect.
- Pentagram style questionnaires. I used third party branding questionnaires only.
- Fiverr and Upwork brief forms. Only an Upwork job post template from 2015 (<https://pages.upwork.com/rs/518-RKL-392/images/Job_Post_Template.pdf>) and third party guides.
- Figma, Webflow, Adobe mobile colour apps, Tailor Brands' colour step, Brandmark's exact flow. Not researched or not confirmable.
- Moniepoint, Kuda, Opay, Paystack and Flutterwave onboarding design write ups. Only regulatory news and vendor KYC blogs.
- Independent KYC drop off statistics. The 40 to 60 percent and 15 to 30 percent figures are vendor claims with no method.
- Nigeria specific evidence for voice notes in forms, verified business badges, or WhatsApp handoff raising completion.
- Opera Mini's current share and behaviour in Nigeria.
- Whether the payment or lead record holds name, phone, email and business, which pre filling depends on.

**Conflicting numbers.** Adult literacy (62 to 70 percent). Pidgin speakers (60 to 121 million). Median mobile speed (about 19 to 44 Mbps). Baymard abandonment (17 or 18 percent). Typeform average completion (47 or 57 percent on its own pages). I give ranges and do not pick one.

**What I did not test.** None of the proposed palettes, copy or time estimates have been tested with users. Contrast of the sample palettes has not been checked. The suggestion to run `color-quantize.ts` in the browser has not been tried. The counts in section E come from reading the spec files, with a small script for the always visible counts, and ignore conditional follow ups.
