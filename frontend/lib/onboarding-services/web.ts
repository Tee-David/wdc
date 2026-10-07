import { UNSURE, type Step } from "../onboarding-shared";

/**
 * The web form's steps (Size first). One file per service so two people can
 * work on two services without touching the same lines. Composed by
 * `stepsFor` in ../onboarding.ts.
 */
export const WEB_STEPS: Step[] = [
  {
    /* SPLIT INTO THREE, and the sections are the client's own. The Fluent
       Forms website export divides this exact ground into "Website Goals and
       Features", "Design and Branding", "Content and Maintenance" and
       "Technical Information" -- so the shape was already there in how the
       studio thinks about a website job, and eleven questions on one screen
       was the thing that did not match it.

       Shorter screens are also what makes the progress bar honest: a step that
       holds eleven questions takes four minutes and moves the bar once. */
    phase: "work", id: "web", service: "web", title: "What the site is for",
    blurb: "The job it has to do, before we talk about how it looks.",
    fields: [
      { key: "site_new_or_existing", label: "Is this a new website, or improving one you have?", kind: "cards", required: true, options: ["Brand new", "Improving an existing site"] },
      { key: "current_url", label: "Your current site", kind: "url", placeholder: "https://", showIf: { key: "site_new_or_existing", equals: ["Improving an existing site"] } },
      { key: "current_problem", label: "What do you like and dislike about it?", kind: "textarea", showIf: { key: "site_new_or_existing", equals: ["Improving an existing site"] } },
      { key: "site_goal", assist: true, label: "What is the site's main job?", kind: "textarea", placeholder: "e.g. take bookings, sell online, show the portfolio" },
      { key: "features", assist: true, label: "Which features would you like on the website?", kind: "multi", options: ["Online store", "Bookings", "Blog", "Gallery", "Members area", "Multi-language", "Other", "None yet"] },
      { key: "features_other", label: "What other feature do you need?", kind: "text", showIf: { key: "features", equals: ["Other"] } },
      { key: "page_count", assist: true, label: "About how many pages do you expect?", kind: "select", options: ["1–5", "6–15", "16–40", "More than 40"] },
    ],
  },
  {
    phase: "work", id: "web_content", service: "web", title: "Content and care",
    blurb: "Who writes it, and who looks after it after launch.",
    fields: [
      { key: "content_ready", label: "Do you have the words and pictures?", kind: "cards", required: true, options: ["They are ready", "I have some of them", "I need WDC to produce them"] },
      {
        key: "content_needed", label: "Which of them do you need from us?", kind: "multi",
        options: ["Words", "Photography", "Both"],
        showIf: { key: "content_ready", equals: ["I have some of them", "I need WDC to produce them"] },
        scope: "Writing and photography are extra to building the site, and quoted separately once we know how many pages there are.",
        tip: "A site cannot launch with placeholder text in it, so this is the thing that most often holds a launch date. Saying it now is what keeps the date.",
      },
      { key: "wants_seo", label: "Should we optimise it for search?", kind: "yesno", required: true, tip: "Search optimisation is the work that makes a site findable on Google: the right words, a clean technical build, and pages that load fast." },
      /* From the client's own website form, which asks both and is right to:
         a site nobody maintains is a site that rots, and it is far cheaper to
         agree that now than to discover it in month four. */
      { key: "wants_maintenance", label: "Will you want ongoing updates and maintenance?", kind: "cards", required: true, options: ["Yes", "No", "Please explain what this includes"] },
      /* THE CLIENT ASKED US SOMETHING AND THE FORM SAID NOTHING BACK. Picking
         "please explain what this includes" is a question, and it led nowhere
         at all -- the one answer on the step that was guaranteed to leave
         somebody waiting. It is answered where it is asked now, and the answer
         ends with the question it was standing in for. */
      {
        key: "maintenance_after_reading", label: "Now you know what it covers, would you like it?", kind: "yesno",
        showIf: { key: "wants_maintenance", equals: ["Please explain what this includes"] },
        hint: "Software and plugin updates, security patches, backups you can actually restore from, uptime monitoring, and somebody who answers when something breaks.",
        scope: "It is a monthly arrangement, separate from building the site, and quoted once we know the size of what we would be looking after. Saying no changes nothing about the build.",
      },
      { key: "wants_blogging", label: "Will you want help with blogging or content marketing?", kind: "cards", options: ["Yes", "No", UNSURE] },
    ],
  },
  {
    phase: "work", id: "web_tech", service: "web", title: "Domain and hosting",
    blurb: "Where the site will live. Nothing technical is expected of you here.",
    fields: [
      { key: "has_hosting", tip: "A domain is your web address. Hosting is where your website runs. If you are unsure what you own, choose please advise and we will help identify it.", label: "Do you already have hosting and a domain?", kind: "cards", required: true, options: ["Both", "Domain only", "Neither", UNSURE] },
      {
        key: "hosting_details",
        label: "Who is it with, and whose name is the account in?",
        kind: "textarea",
        placeholder: "e.g. domain with Namecheap, hosting with Whogohost, both in Tobi's name",
        /* WE DO NOT ASK FOR THE LOGIN, and the client's own form does -- three
           times, for the website, the domain and the hosting. It is the
           obvious next question and it is the wrong one: a password typed into
           a web form is a password sitting in a database, in a draft in
           someone's browser, and in whatever inbox a notification lands in --
           and it would be OUR fault when it leaked, not the client's. Naming
           the provider is all we need to know what we are dealing with; the
           access itself is handed over later through the provider's own
           delegated access, or a one-time secret link, at the point it is
           actually needed. Saying so here is also reassuring: a form that asks
           for a hosting password tells a client something about how the rest
           of their data will be treated. */
        hint: "Just the provider and the account holder. Please do not put passwords in this form. We will set access up properly with you when we get there.",
        showIf: { key: "has_hosting", equals: ["Both", "Domain only", UNSURE] },
      },
      {
        /* A TEXTAREA HERE PROMISED SOMETHING IT COULD NOT DO. It said "we will
           check what is free" and then took a paragraph somebody had to read,
           unpick and check by hand days later. The client can check now, and
           the honest three-state answer is the whole reason this is a control
           rather than a box: `.ng` has an RDAP service that does not respond,
           and `.io` and `.co` publish none at all, so "we will check this one
           by hand" is a real outcome and is said plainly. See lib/rdap.ts.

           THE CHECKER ITSELF IS OFFERED, NOT IMPOSED, and the offer lives
           inside the control rather than as a question of its own, so the step
           count, the validation and the review screen are all unchanged by it.
           Picking a favourite is one tap on a result for the same reason:
           "which of these do you actually want" is what the first call opens
           with, and it did not deserve a fourth question. */
        key: "domain_ideas", assist: true, label: "Domain names you would like, best first", kind: "domains",
        tip: "Include the ending you want, like .com or .com.ng. Torn between a few? Put them all in and the field will offer to check them.",
        showIf: { key: "has_hosting", equals: ["Neither"] },
      },
      {
        key: "hosting_wanted", label: "Would you like us to buy and set them up for you?", kind: "yesno",
        showIf: { key: "has_hosting", equals: ["Neither"] },
        scope: "The domain and the hosting are paid to the registrar and the host, not to us. Our time to set them up is extra to the build, and you will see both figures before anything is bought.",
        tip: "Whatever is bought is registered in YOUR name, not ours. Losing control of a domain is the single most expensive thing that happens to a small business online, and it is entirely preventable at the start.",
      },
    ],
  },
];
