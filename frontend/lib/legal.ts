import {
  COMPANY_NAME,
  CONTACT_EMAIL,
  REGISTERED_NAME,
  REGISTRATION_NO,
  REGISTRAR,
  SITE_URL,
} from "@/lib/site";

/**
 * The legal documents.
 *
 * WRITTEN FOR WDC, NOT COPIED. The brief pointed at another agency's policy
 * pages as a model for SHAPE, and shape is all that was taken: the documents,
 * a contents rail, plain headings. The words are written here for this
 * company, and they had to be, twice over. Policy text is a copyrighted work
 * like any other, so lifting it is an infringement; and more to the point a
 * privacy policy is a set of promises about what a specific business actually
 * does with data. Copying another firm's promises means publishing statements
 * about WDC that nobody has checked are true. Everything below describes how
 * this site and this studio actually operate.
 *
 * FACTS ABOUT THE ENTITY ARE SUPPLIED, NEVER GUESSED. The CAC registration is
 * now published in both the privacy policy and the terms, from the constants
 * in lib/site.ts. It is cited as a BUSINESS NAME registration (BN), because
 * that is what was given: the Corporate Affairs Commission issues an RC number
 * to an incorporated company and a BN number to a registered business name,
 * and they are different legal forms. Writing "RC" over a BN would be
 * asserting a company that does not exist.
 *
 * What is still absent is absent for the same reason: no registered office
 * address, no named Data Protection Officer. Where such a detail belongs, the
 * text points at the contact address instead, which is real. `OPEN_ITEMS` at
 * the bottom lists what a director or practitioner still has to supply.
 *
 * JURISDICTION. WDC operates from Nigeria, so the data sections are written
 * against the Nigeria Data Protection Act 2023 and the rights it actually
 * grants. Clients outside Nigeria are covered by the transfer section rather
 * than by pretending to a GDPR lead-authority position the studio does not
 * have.
 *
 * THIS IS NOT LEGAL ADVICE. It is a careful, honest draft written by the team
 * that built the site. Before it is relied on commercially it should be read
 * by a qualified Nigerian practitioner, particularly the liability and
 * engagement sections.
 */

/** One date for the set, so the documents cannot disagree about their age. */
export const LEGAL_UPDATED = "8 October 2026";

export type LegalSection = { heading: string; body: string[]; /** Which tab of a tabbed document it belongs to. Absent means General. */ tab?: string };

export type LegalDoc = {
  slug: string;
  title: string;
  /** Shown on the index card and in the page's meta description. */
  blurb: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
  /** A tabbed document (the Client Engagement Policy has one per service). */
  tabs?: { id: string; label: string }[];
};

export const LEGAL_DOCS: LegalDoc[] = [
  /* ------------------------------------------------------------------ */
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    blurb:
      "What personal information we collect, why we hold it, how long we keep it, who else sees it, and the rights you have over it.",
    updated: LEGAL_UPDATED,
    intro: `This policy explains what personal information ${COMPANY_NAME} collects when you use this website, fill in a form, or work with us, what we do with it, and what you can ask us to do about it. It is written to be read, not to be survived.`,
    sections: [
      {
        heading: "Who we are",
        body: [
          `${COMPANY_NAME} is a creative and digital agency operating from Nigeria. We design brands, build websites, applications and software, and run search and social media work for our clients.`,
          `We are registered with the ${REGISTRAR} as ${REGISTERED_NAME}, ${REGISTRATION_NO}.`,
          `For the information described here we are the data controller: we decide why it is held and what happens to it. Where we hold your customers' information on your behalf while building or running something for you, you are the controller and we act on your instructions. You can reach us about anything in this document at ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: "What we collect",
        body: [
          "What you give us on our forms. The contact form asks for your name, email address, an optional phone number and your message. The onboarding brief asks about you, your business and the work you want: names, phone, email, company, industry, audience, goals, deadlines, who approves the work, and anything you choose to write. You may upload logos, pictures, documents and files. Some questions are optional, and we say which.",
          "Unfinished briefs. While you fill in an onboarding brief, your answers are saved as a draft so you can leave and come back, in your browser and on our server. If you ask us to send you a link to continue later, or one of our team sends you a pre-filled link, the draft is tied to that link.",
          "What we are given to do the work. Delivering a project often means being handed access to something that belongs to you: a domain, a hosting account, an analytics property, an advertising account, a store, a social media profile, a brand archive. These may contain personal data belonging to you, your staff or your customers. We treat all of it as yours, not ours.",
          "Your account. If you sign in to the client portal we hold your name, email address, how you sign in (a password stored only as a salted hash, or your Google account), and a record of what you have viewed, approved and paid.",
          "Payments. When you pay through our payment provider, they collect your card or bank details directly. We receive the result: the amount, the reference, the status, the date and the last digits or channel they report. We never see or store a full card number.",
          "Meetings. Review meetings, calls and the handover meeting are held on Google Meet, Zoom or by phone, and may be recorded. We tell you before recording starts. A recording, the chat and any notes we take are personal information, and they may show your face, your voice, your screen and anything you say or open during the call.",
          "Messages. We keep a record of the emails the system sends you, with the time and whether they were delivered, so that we do not send the same message twice and can answer 'did it reach me?'.",
          "Collected automatically. Our hosting provider records ordinary server information when a page is requested: an IP address, the page, a timestamp, and the browser and device the request reports. This keeps the site running and secure.",
          "We do not ask for, and do not want, payment card numbers, government identity numbers, health information or anything else sensitive. Please do not send them to us by email or in a form.",
        ],
      },
      {
        heading: "Why we hold it, and on what basis",
        body: [
          "To answer you. An enquiry cannot be replied to without a reply address. Our basis is your request, and the legitimate interest both of us have in the conversation happening.",
          "To prepare and deliver an engagement. A brief is used to understand the work, plan it and quote it. Once a project is agreed we process what the work requires under the contract between us.",
          "To remind you, once or twice, to finish something you started. See Messages and Reminders: we send at most two reminders about an unfinished brief, and every one carries a link that switches reminders off.",
          "To meet obligations. Invoices, records of payment and tax records are kept because the law requires them.",
          "To keep the site and your account safe. Server logs, sign-in checks, rate limits and the screening of throwaway email addresses rest on our legitimate interest in running a service that is available and not being abused. We also check new passwords against lists of passwords that have appeared in known breaches, by sending only a short fragment of a one-way fingerprint of the password, never the password itself.",
          "If we ever want to use your information for something outside these, such as putting your name on a newsletter, we will ask you first and you will be able to say no without it affecting anything else.",
        ],
      },
      {
        heading: "Meetings and recordings",
        body: [
          "We may record review meetings and always offer a recorded handover meeting, so you can watch it again, share it with your own team and learn at your own pace. We tell you before we record and you may say no. If you do, we will give you a written walkthrough instead.",
          "A recording is shared with you by a private link and is kept for the life of the engagement. After that we keep it for as long as we need it to deal with a question about the work, and delete it on your request unless the law requires us to keep it. Do not show or say anything on a recorded call that you do not want recorded, such as passwords or customer personal data.",
          "Anyone you invite to a meeting is your responsibility. Tell them it may be recorded.",
        ],
      },
      {
        heading: "When we handle your customers' information for you",
        body: [
          "If we build, host or run something for you that collects or stores information about your customers, staff or visitors, such as a shop, a booking form, a mailbox or an app, you decide why that information is collected and how it is used. We act only on your instructions, as your processor, and treat it as confidential.",
          "You are responsible for telling your own users what you collect, for having a lawful basis, for the consents and notices they are owed, and for answering their requests. We help where we reasonably can.",
          "We use reasonable measures to keep it safe, we give it only to the suppliers needed to provide the service, and we tell you without undue delay if we learn of a breach that affects it. When the engagement or hosting ends we return it to you or delete it on your instruction, except what the law requires us to keep.",
        ],
      },
      {
        heading: "Showing work we have done",
        body: [
          "We are an agency, so our own marketing includes the work we have delivered. Published case studies, portfolio images and testimonials appear with the client's agreement.",
          "If you would rather your project were not shown, or shown without naming you, tell us and we will take it down or anonymise it. You do not need to give a reason.",
        ],
      },
      {
        heading: "Who else sees it",
        body: [
          "We do not sell personal information, and we do not share it for anyone else's marketing.",
          "Some of it passes through the suppliers who let us operate, and each sees only what its part of the job needs: the company that hosts this website, the database that stores forms and accounts, the storage that holds files you upload, the provider that carries our email, our payment provider, the scheduling tool used for meetings, and the tools we use to write, design and track project work. The chat assistant on the site is run by Jotform and is covered by the Cookie Policy.",
          "Messaging apps. If you ask us to run a WhatsApp group or similar for your project, the app is operated by another company, and everyone in the group can see each other's names and numbers. Only add people who should see them.",
          "Our team members see what they need for the projects they work on. Access is by individual account and is removed when someone leaves or changes role.",
          "A client's own accounts, such as an advertising platform or an analytics property, are reached with access the client controls and can withdraw at any time. We never ask for a password to be sent to us.",
          "We will disclose information where a law, a court or a regulator with proper authority requires it. If that happens and we are permitted to tell you, we will.",
          "If the business were ever sold or merged, client records would pass to the new owner only on the same terms as this policy, and we would tell you first.",
        ],
      },
      {
        heading: "Leaving Nigeria",
        body: [
          "Several of the suppliers above operate outside Nigeria, so some information is stored or processed abroad. Where that happens we use established providers whose terms commit them to protecting the data and to restricting what they may do with it, and we send only what the task needs. By using the site or sending us information you understand this; where the Nigeria Data Protection Act asks for another safeguard or a specific consent, we rely on that instead.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Unfinished onboarding briefs are deleted, with their resume links, after a set period from the last save. The default is 180 days.",
          "A contact enquiry that does not become a project is kept so a conversation can restart, and is then anonymised: the name, address, phone and message are removed and only the topic and date remain for our records. We keep enquiries until we choose to run that clean-up, and we review the period at least once a year.",
          "A submitted brief and the project records that follow are kept for the life of the engagement and for six years after it ends, the period in which a contractual question could still arise.",
          "Financial records are kept for as long as Nigerian tax and company law requires.",
          "Access we were given to your systems is given up when the engagement ends. If we still hold an access we no longer need, ask and we will remove it.",
          "Invitations that were used, withdrawn or expired are deleted after 90 days. Expired sign-in sessions and security tokens are removed after a day.",
          "Someone who unsubscribes from our messages is kept on a suppression list, because that record is what stops them being added again by mistake. If you ask us to erase your data, we keep only a one-way fingerprint of your address for that purpose.",
        ],
      },
      {
        heading: "How it is protected",
        body: [
          "This site is served over HTTPS. Passwords are never stored in readable form. Forms and sign-in are rate limited and checked on our server, not only in your browser. Links we email you for a draft, a payment or a reset are single purpose and expire. Access to client accounts and project systems is limited to the people working on that engagement.",
          "We will not pretend to be impregnable. No website or company is, and a policy that claims otherwise is not being straight with you. What we can say is that we take reasonable measures, keep the number of people who can reach your data small, and if a breach affects your personal information we will tell you, and the regulator where the Nigeria Data Protection Act requires it, without undue delay.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Under the Nigeria Data Protection Act 2023 you may ask us for a copy of the personal information we hold about you, ask us to correct it if it is wrong, ask us to delete it where we have no continuing reason to keep it, ask us to restrict what we do with it while a dispute is resolved, object to processing we carry out on the basis of legitimate interest or for direct marketing, withdraw a consent you gave, and ask for your information in a portable form.",
          `Write to ${CONTACT_EMAIL} and we will respond within thirty days. There is no charge. We may need to confirm it is really you first. If we cannot do what you have asked, we will tell you why rather than simply declining.`,
          "If you are not satisfied with how we have handled a request, you can complain to the Nigeria Data Protection Commission. We would rather you came to us first, but that route is yours regardless.",
        ],
      },
      {
        heading: "Children",
        body: [
          "This website and our services are aimed at businesses and organisations, not at children. We do not knowingly collect personal information from anyone under eighteen. If you believe a child has sent us information, tell us and we will delete it.",
        ],
      },
      {
        heading: "Changes to this policy",
        body: [
          "When this policy changes, the date at the top of the page changes with it. If a change materially affects what we do with information we already hold, we will contact the clients affected rather than relying on them to notice.",
        ],
      },
      {
        heading: "Contact",
        body: [
          `Questions, requests and complaints about this policy all go to ${CONTACT_EMAIL}. A real person reads that address.`,
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    blurb:
      "The terms on which this website and your account are offered, what the content on it does and does not amount to, and who owns what.",
    updated: LEGAL_UPDATED,
    intro: `These terms govern your use of ${SITE_URL}, the forms on it and the client portal. Using them means accepting these terms. The terms of an actual project are separate and are set out in the Client Engagement Policy and in the agreement we sign with you.`,
    sections: [
      {
        heading: "Using the site",
        body: [
          "You are welcome to read, link to and share what is published here. You agree not to use the site unlawfully, not to attempt to reach any part of it you have not been given, not to introduce anything malicious, and not to act in a way that would stop it working for other people.",
          "Automated collection of the site's content at a scale that burdens the server, or to reproduce it elsewhere, is not permitted.",
        ],
      },
      {
        heading: "Forms and what you send us",
        body: [
          "Give us true information, and only send what you have the right to send. Do not use our forms to send spam, advertising, anything unlawful or abusive, anything that infringes someone else's rights, or a throwaway or anonymous email address: we turn those away on purpose, because we could not reach you and we could not trust the brief.",
          "Sending a form is a request to talk. It is not an order, and it does not bind either of us. A quote, estimate or suggested price given from a brief is a basis for discussion until it is agreed in writing.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "Keep your sign-in details to yourself and tell us at once if you think someone else has them. You are responsible for what is done through your account. We may suspend an account that is being misused, or that we reasonably believe is compromised, and we will tell you why unless the law or a security reason stops us.",
          "People you add to your account act on your behalf. Removing someone is your job.",
        ],
      },
      {
        heading: "What the site is not",
        body: [
          "Everything published here, including case studies, articles, tools and service descriptions, is general information about what we do. It is not professional advice for your situation, and it is not an offer capable of acceptance. Our free tools, such as the SEO checker and the name checker, give indications only and are not a guarantee, a legal clearance or a prediction of results.",
          "A description of work we delivered for one client is a record of that engagement. It is not a prediction of what the same approach would achieve for you.",
          "No client relationship, and no obligation on our part to deliver anything, begins until we have agreed an engagement in writing.",
        ],
      },
      {
        heading: "Our intellectual property",
        body: [
          `The design, code, text, layout and original graphics of this site belong to ${COMPANY_NAME}, registered as ${REGISTERED_NAME} (${REGISTRATION_NO}), and are protected by copyright. The name We Dig Creativity, the WDC mark and our logo are ours.`,
          "You may quote short extracts with attribution and a link. You may not reproduce the site's design or substantial parts of its content as your own, and you may not use our name or marks in a way that suggests a relationship or endorsement that does not exist.",
        ],
      },
      {
        heading: "Client work shown here",
        body: [
          "The brands, logos, artwork and screenshots in our portfolio belong to the clients they were made for, and appear here with their agreement to illustrate our work. Nothing on this site transfers any right in a client's brand to anyone, and their marks may not be reused.",
        ],
      },
      {
        heading: "Links out and embedded services",
        body: [
          "We link to client sites and third-party tools, and some pages embed services such as the chat assistant or a live preview. Those are not ours, we do not control what they publish or how they work, and a link is not an endorsement. Their own terms apply while you use them.",
        ],
      },
      {
        heading: "Availability",
        body: [
          "We try to keep this site up and correct. We do not promise it will be available without interruption, or that everything on it is complete and current at every moment. We may change, move or withdraw any part of it.",
        ],
      },
      {
        heading: "Things you must not do, and what you agree to cover",
        body: [
          "You agree to use the site, the forms and your account lawfully, and not to submit anything that infringes another person's rights, is false, abusive or malicious, or that you have no right to send.",
          "You agree to cover us for any loss, claim, penalty or reasonable cost, including reasonable legal fees, that comes from your breach of these terms, from what you submit through the site or your account, or from your unlawful use of either. We will tell you promptly about a claim and let you help with the defence, as far as that does not prejudice us.",
        ],
      },
      {
        heading: "No warranty",
        body: [
          "The site, its tools and its content are provided as they are and as available. To the extent the law allows, we give no warranty, express or implied, that they are error-free, uninterrupted, fit for a particular purpose or will give a particular result.",
        ],
      },
      {
        heading: "Events outside our control",
        body: [
          "We are not responsible for a failure or delay caused by something beyond our reasonable control, such as power or network failure, a fault at a hosting, email, payment or platform provider, a government act, strike, fire, flood, epidemic, or an attack on our systems despite reasonable security.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "To the extent the law allows, we are not liable for loss arising from your use of this website or from reliance on general information published on it, including loss of profit, business or data.",
          "Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be limited. Liability arising out of an actual engagement is governed by that engagement's own agreement and the Client Engagement Policy, not by this page.",
        ],
      },
      {
        heading: "Governing law",
        body: [
          "These terms are governed by the laws of the Federal Republic of Nigeria, and the Nigerian courts have jurisdiction over any dispute arising from them. We would like to talk first.",
        ],
      },
      {
        heading: "The rest of the agreement",
        body: [
          "If a part of these terms is found unenforceable, the rest stays in force. Our not enforcing a term at some moment does not waive it. You may not transfer your account or rights under these terms without our written consent. We may send notices to the email address on your account or form.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We may update these terms. The version published here, with the date at the top of the page, is the one that applies. If a change matters to clients we are working with, we will tell them directly.",
        ],
      },
      {
        heading: "Contact",
        body: [`Questions about these terms go to ${CONTACT_EMAIL}.`],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    blurb:
      "What this site stores in your browser, what third-party services it loads, what each is for, and how to clear it.",
    updated: LEGAL_UPDATED,
    intro:
      "This policy describes what this website stores on your device and which other services it loads, and why. It is short, because we keep it that way.",
    sections: [
      {
        heading: "What a cookie is",
        body: [
          "A cookie is a small file a website asks your browser to keep, so something can be remembered between pages or visits. Local storage and similar technologies do the same job by a different mechanism, and everything below applies to those too.",
        ],
      },
      {
        heading: "What this site stores itself",
        body: [
          "Your theme choice. When you switch between light and dark, the choice is kept in your browser so the site does not start in the wrong one. It stays on your device and is not sent to us.",
          "Your onboarding progress. While you fill in a brief, your answers and place are kept in your browser so a refresh or a dropped connection does not lose them, and are also saved to our server as a draft. Starting over, or submitting the brief, clears the browser copy.",
          "Signing in. If you use the client portal or the admin area, we set a session cookie that keeps you signed in, and a small marker so the page knows you are. They are needed for sign-in to work, and they are removed when you sign out or they expire. Related security data, such as a short-lived check on a new password, is kept for the same reason.",
          "Security and delivery data set by our hosting platform to serve pages and protect the site from abuse.",
        ],
      },
      {
        heading: "Things we load from others",
        body: [
          "The chat assistant. Some pages show a chat assistant provided by Jotform. When it loads, Jotform may set its own cookies or storage and receives your IP address and browser details, as it must to answer. What it stores and does is governed by Jotform's own policy.",
          "Accessibility tools. The site offers an accessibility menu provided by a third party. It remembers the display options you choose, on your device, so they stay when you move between pages.",
          "Payments and meetings. If you go to pay, or to book a call, you are taken to our payment provider or scheduling tool. They set their own cookies on their own pages.",
          "Fonts and previews. Fonts, and on work pages a preview frame of a client's live site, are fetched from other services. Fetching a resource tells that service your IP address, because it has to in order to send the file back.",
          "This site does not run advertising trackers, does not fingerprint your device, and does not use marketing pixels.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "If we measure how the site is used, we do so in aggregate to learn which pages are useful, and not to build a profile of one visitor or to target advertising at you. If we add a tool that sets analytics cookies, we will list it here before it ships.",
        ],
      },
      {
        heading: "Your control",
        body: [
          "Every browser lets you see, block and delete cookies and site data, usually under privacy or site settings. Clearing them for this site removes your theme choice and any saved onboarding answers on that device, and signs you out. Blocking the sign-in cookie means the portal will not work; blocking the rest will not break the public pages. Settings in the third-party services above are managed with those services.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "If we add anything that stores more than the above, this page will be updated before it ships and the date at the top will change.",
        ],
      },
      {
        heading: "Contact",
        body: [`Questions about this policy go to ${CONTACT_EMAIL}.`],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "client-engagement-policy",
    title: "Client Engagement Policy",
    tabs: [
      { id: "general", label: "General" },
      { id: "branding", label: "Brand and design" },
      { id: "web", label: "Websites" },
      { id: "domains", label: "Domains and hosting" },
      { id: "payments", label: "Payments and integrations" },
      { id: "apps", label: "Apps" },
      { id: "software", label: "Software and AI" },
      { id: "seo", label: "Search (SEO)" },
      { id: "social", label: "Social media" },
    ],
    blurb:
      "How a project starts, what each side is responsible for, what is included, who owns the work, what we cannot promise, and how an engagement ends.",
    updated: LEGAL_UPDATED,
    intro:
      "This policy sets out how we work with clients: how an engagement begins, what we each commit to, what is and is not included, who owns what at the end, and what happens when something goes wrong. It is the standard we hold ourselves to. Where a signed agreement for your project says something different, that agreement wins. The short version of these terms that appears at the end of our onboarding briefs is drawn from this page.",
    sections: [
      {
        heading: "How an engagement begins",
        body: [
          "It begins with a conversation about the outcome you want, not a feature list. We would rather understand what the work has to achieve than quote for a specification that may not get you there.",
          "Your onboarding brief, a call and any material you send are the starting point. From them we put the scope in writing: what is included, what is not, what we need from you, what it costs, the rounds of revision included, and roughly when. Work starts when you have accepted that in writing and any deposit is settled. Nothing said in a meeting, a chat message or an email thread changes the agreed scope until it is written down and both sides have accepted it.",
          "The usual order is a discovery call, then agreement of the scope, then payment of the deposit, then our onboarding form, then we set up your client portal and the way we will keep in touch (a WhatsApp group, calls or email, as you choose), then the work, with review meetings along the way and, where the project has one, a handover meeting at the end. How long a project runs depends on what it is: a flyer can take days, a website weeks, an app months. Your agreed scope says what applies to yours, and we never ask you to assume a length from another kind of job.",
          "A brief is not a contract and a quote is not a promise of a date. The agreed scope document, together with this policy, is.",
        ],
      },
      {
        heading: "What we commit to",
        body: [
          "To tell you the truth about the work: when something we recommended has not worked, when a date is going to move, when a cheaper or smaller thing would serve you better, and when you do not need what you asked for.",
          "To deliver to the agreed scope, at the standard the work is described at, and to keep you included as it happens rather than presenting a finished thing at the end.",
          "To keep what we learn about your business confidential, and to treat any access you give us as yours, used only for the work and given up when it ends.",
          "To be reachable, and to answer the same working day where we can.",
          "To explain what you are paying for, in words, and to tell you before a cost is incurred that is not ours to absorb.",
        ],
      },
      {
        heading: "What we need from you",
        body: [
          "One person who can make decisions and give approvals. Projects slow down most often because feedback arrives from several directions and contradicts itself. The person you name on the brief is the one whose approval counts, and you can change them by telling us in writing.",
          "Content, assets, access and answers when they are needed. Much of what we build cannot be finished around missing material, and waiting for it moves the delivery date rather than compressing the work.",
          "Feedback within the window we agree at each review stage, which is normally five working days. If it does not arrive, the timeline moves by the same amount, and if a project is silent for thirty days we may pause it and reschedule when you are back.",
          "That you have the right to give us what you give us. Copy, images, fonts, music, data and trademarks handed to us are used on the basis that you are entitled to use them, and you deal with any claim that you were not.",
          "Access through each tool's own sharing settings, never by sending us a password.",
        ],
      },
      {
        heading: "Reviews and the handover meeting",
        body: [
          "Projects differ, so your agreed scope says how many review meetings there are, how long they run, how they are held and when the project closes. A flyer may have none and a website usually has a couple. A further review is new work unless the scope says otherwise.",
          "Where a project has a handover meeting, we agree it with you in advance. It is held on Google Meet, Zoom or whichever method we agree, and it is recorded. We walk you through what was built and what it does, from the public pages to the admin area or content system if there is one, show you how to manage it, how to reach it and where things are, and answer your questions.",
          "After the meeting we send a handover document with what you need to reach and run your project: links, the access details and logins we are handing over, webmail where it applies, the link to the recording, and instructions specific to your project. Keep the document safe and change the passwords in it. Once handover is done, looking after your passwords and your users is your responsibility.",
          "The handover meeting is part of delivery. Where you cannot attend, tell us and we will rebook it once. If a handover is not completed within the time agreed for reasons that are yours, the work counts as delivered for payment and any warranty or review period starts, and we will still give you the document and the recording.",
          "How a project closes depends on its kind. Some close at handover, such as a content-managed website, a flyer or a logo. Others have a testing and review period first, such as a web or mobile app. The tab for your service says which.",
        ],
      },
      {
        heading: "Revisions and changes of mind",
        body: [
          "Every stage includes review and revision, for the number of rounds in the agreed scope. That is part of the work, not an extra. A round is one consolidated set of changes sent together from the approver.",
          "A change of direction is different from a revision. Re-doing something already approved, or adding to the agreed scope, is new work: we will say so at the time, price it, and wait for your agreement before starting. We will not quietly absorb it and we will not quietly invoice for it.",
          "Once a stage is approved in writing, going back to it is a change of direction. Some kinds of work have tighter limits on revisions than others. The tab for your service lists them, and your agreed scope wins if it says something different.",
        ],
      },
      {
        heading: "Timelines",
        body: [
          "Dates given at the start are estimates based on the scope as agreed and on material and feedback arriving when expected. We will tell you as soon as we know a date is at risk, with the reason and the new date, rather than at the point it is missed.",
          "A date that you ask us to bring forward may need extra resource or a smaller scope. We will tell you which, and what it costs, before agreeing.",
        ],
      },
      {
        heading: "Fees and payment",
        body: [
          "Fees, the schedule and the currency are set out in the agreed scope. Projects normally start with a deposit, with the balance tied to stages or to delivery. Payment details are in our Payments and Refunds Policy.",
          "Invoices are due within the period stated on them. Where payment is significantly overdue we may pause work, and we will tell you before we do rather than simply stopping. Dates move by the length of the pause.",
          "Third-party costs such as domains, hosting, licences, stock, app store accounts and advertising spend are yours and are separate from our fees. We identify them before they are incurred. Where we pay one on your behalf, we invoice it at cost.",
        ],
      },
      {
        heading: "Who owns the work",
        body: [
          "On final payment, ownership of the final deliverables created specifically for you passes to you: the brand marks, the design files, the copy we wrote for you, and the custom code written for your project. Until then we keep the rights, and we may withhold final files.",
          "Some things cannot pass, because they were never ours to give. Third-party components, open-source libraries, licensed fonts, music and stock images remain with their owners and reach you under their own licences, which we identify. Our own general tooling, internal libraries and working methods stay ours, and using them for you does not transfer them. We grant you a lasting licence to use anything of ours that is built into what we deliver, for the purpose it was delivered.",
          "Concepts that were presented and not selected remain ours, and we will not sell them as the same thing to a competitor of yours while your engagement is live.",
          "A trademark is not made safe by good design. Registering a name or mark, and checking that it is free to use, is your responsibility. We can point you to someone who does it.",
        ],
      },
      {
        heading: "Acceptance and signing off",
        body: [
          "Work is accepted when your named approver says so in writing, when you use it for real, or fourteen days after we deliver it, whichever is first, unless within those days you tell us in writing what does not match the agreed scope. After that, a change is a change request, and a defect is dealt with under the warranty period.",
        ],
      },
      {
        heading: "Showing the work",
        body: [
          "Unless you ask us not to, we may show completed work in our portfolio and describe what it involved. If a project is confidential, or you would rather it were not shown, say so in writing and it will not be.",
        ],
      },
      {
        heading: "Confidentiality",
        body: [
          "What you tell us about your business stays with the people working on your project. This holds after the engagement ends. We will sign your non-disclosure agreement if you have one. Information that is already public, that you tell us we may share, or that the law requires us to disclose is not covered.",
        ],
      },
      {
        heading: "What we cannot promise",
        body: [
          "We do our work carefully and we do not promise a result. Rankings, traffic, enquiries, sales, followers, ad performance, and approval of an app by a store depend on people and platforms we do not control, and we never guarantee them.",
          "Platforms, search engines, app stores and payment providers change their rules and their systems. When they do, we tell you and adjust the work, but the change is not our fault and not a defect.",
          "Artificial intelligence can be wrong. Where a system we build or use produces text, decisions or advice, a person should check anything important before relying on it.",
          "Where your product collects information about your own customers, you are responsible for using it lawfully and for the notices and consents your users are owed. We will build in what is agreed and tell you what we notice.",
          "To the extent the law allows, our responsibility to you for any problem arising from an engagement is limited to the fees you paid us for the work in question, and we are not liable for loss of profit, revenue, business or data. Nothing here limits liability for fraud, for death or personal injury caused by negligence, or for anything that cannot lawfully be limited.",
        ],
      },
      {
        heading: "What you agree to cover us for",
        body: [
          "You agree to indemnify us, our team and our subcontractors, and to keep us indemnified, against any claim, demand, loss, damage, penalty, fine and reasonable cost, including reasonable legal fees, that arises from: (a) anything you give us or tell us to use, such as logos, names, pictures, fonts, music, text, data, code or access, including a claim that it infringes someone's rights or was not yours to give; (b) an instruction you give us or a decision you or your approver make against our advice; (c) how you or your customers use what we deliver, and your content, products, services, prices, claims or advertising; (d) your breach of a law, of a platform's rules or of a licence, including data protection, consumer protection, advertising, tax and trademark law; (e) personal information you collect, store or process through what we build or host for you; (f) your failure to pay a third party, renew a domain, a licence or a service, or to keep an account secure; (g) a change made to our work by you or anyone not acting for us; and (h) your breach of this policy.",
          "We will tell you promptly about a claim and let you control its defence and settlement, as long as you do it reasonably and keep us informed, and we may take part with our own lawyers at our own cost. We will not admit liability or settle in a way that binds you without asking. You do not have to cover a loss that a court decides was caused by our own fraud or wilful default.",
          "This promise carries on after the engagement ends.",
        ],
      },
      {
        heading: "People we work with",
        body: [
          "We may use freelancers, contractors and other companies to deliver your work. We are responsible to you for their work as if it were ours, and we keep them to the confidentiality in this policy. Tools and services we use, including AI tools, are used with care, and we do not feed your confidential material into a tool that would keep or learn from it without telling you.",
        ],
      },
      {
        heading: "Events outside our control",
        body: [
          "Neither of us is responsible for a delay or failure caused by something beyond reasonable control, such as power or network failure, a fault at a platform, hosting, email or payment provider, a change in law, government action, strike, fire, flood, epidemic or a cyber attack despite reasonable security. The affected dates move by the length of the event. If it lasts more than sixty days, either of us may end the engagement as set out below.",
        ],
      },
      {
        heading: "After launch",
        body: [
          "Delivery includes handover: the files, the access, and an explanation of how what we built works.",
          "Software and websites need maintenance, and campaigns need running. Those are separate arrangements and we will tell you honestly which ones you actually need rather than selling a retainer by default.",
          "Where we agreed a warranty period, defects in what we built are fixed within it at no charge. A defect means it does not do what we agreed it would. A new requirement, a change by a platform, or a change you or someone else made after delivery is not a defect.",
        ],
      },
      {
        heading: "Ending an engagement",
        body: [
          "Either side may end an engagement in writing. You pay for the work done and the costs committed up to that date, and we hand over what has been paid for, in the state it is in. Deposits are dealt with as set out in the Payments and Refunds Policy.",
          "If we are the reason it has ended, we will not hold finished work you have already paid for.",
          "Confidentiality, ownership, the limits above and anything else that by its nature carries on, carries on.",
        ],
      },
      {
        heading: "When something goes wrong",
        body: [
          `Tell us. Write to ${CONTACT_EMAIL} or speak to whoever you have been dealing with, and we will respond within five working days with what we intend to do about it.`,
          "We would far rather fix a problem than have you live with it or hear about it from somebody else. Where we have got something wrong, we will say so plainly. If we cannot settle it by talking, either of us may involve a mediator before going further.",
        ],
      },
      {
        heading: "Governing law",
        body: [
          "Engagements are governed by the laws of the Federal Republic of Nigeria unless the signed agreement for your project says otherwise, and the Nigerian courts have jurisdiction. We will try to resolve any dispute by discussion before either side takes it further.",
        ],
      },
      {
        heading: "The legal small print",
        body: [
          "This policy and your agreed scope make up the whole agreement for your engagement. They replace anything said before, and if they conflict, the signed scope comes first, then this policy.",
          "If a part of it is found unenforceable, the rest stays in force. Not enforcing something at a moment does not waive it. Neither of us may transfer the agreement without the other's written consent, except that we may pass it to a successor to our business.",
          "Agreeing by email, by the client portal, by a signed document or by paying a deposit counts as agreeing in writing. A notice by email to the address on your account or brief reaches you when it is sent.",
          "Nothing in this policy makes either of us the other's partner, agent or employee.",
          "Anything that by its nature should carry on after the engagement, such as ownership, payment, confidentiality, the limits on what we promise and what you cover us for, does.",
        ],
      },
      {
        tab: "branding",
        heading: "How design work runs",
        body: [
          "Design starts with your brief and your inspiration. We take them in, agree a design direction with you, and only then design. The direction is where you steer. The designs that follow are the direction, carried out.",
          "A logo, a flyer, a social media design or any single piece: after we send the final version you get one revision. We do not make alternative versions or variations of a piece, and we do not start again in a different direction. If you want a different direction, that is a new piece of work, quoted before it starts.",
          "A brand guide: we do one design direction. After we send it you get one round of corrections. We do not redo a whole brand guide again in another direction.",
          "A full identity system: we agree one direction, develop it, and give you one round of revisions per stage as set out in the scope. Going back over an approved stage is a change of direction.",
          "Once a final version is sent and the revision you are entitled to has been made, that work is complete.",
        ],
      },
      {
        tab: "branding",
        heading: "Say what you want before we start",
        body: [
          "We would rather be clear than have you upset later. Tell us your inspiration, your audience, the words that must appear, and the things to avoid, before design begins. Feedback should come from your named approver in one consolidated message.",
          "A flyer or poster has a lot riding on small things. Check the spelling, the names, the dates, the prices, the phone numbers and the addresses before you approve. After you approve, a mistake in text you gave us or approved is not ours to fix for free.",
        ],
      },
      {
        tab: "branding",
        heading: "Files, formats and licences",
        body: [
          "A logo is delivered in the formats and variants in your scope, normally including PNG and SVG in colour, black and white, and reversed, as a wordmark, a symbol and a combined lockup, where they apply. Print and screen colours look different, and a printer's output can differ from what you saw on screen.",
          "Fonts, pictures and music may carry licences. We tell you which ones are in your work, and you keep to them. Motion work that uses music needs a licence for that music.",
          "Batch and monthly jobs run to the quantity and dates agreed. A new batch, or one more piece, is new work.",
          "Checking that a name or mark can be registered as a trademark is your responsibility. A design is not a legal clearance. We can point you to someone who does it.",
        ],
      },
      {
        tab: "branding",
        heading: "Print and production",
        body: [
          "Unless the scope includes it, we design for print but do not manage the printer. Ask the printer for a proof and check it. We are not responsible for printing errors, colour shifts or damage that happens after we hand over the files.",
        ],
      },
      {
        tab: "web",
        heading: "Content-managed websites close at handover",
        body: [
          "A website built on a content management system is complete once we have handed it over: the handover meeting is held, the handover document and the recording are sent, and you have had your agreed review rounds. After that the project is concluded.",
          "After handover, a defect is fixed under the warranty period in your scope. A new page, a redesign, a new feature or a change you want after that is new work or part of a maintenance arrangement, quoted before it starts.",
        ],
      },
      {
        tab: "web",
        heading: "Your domain, hosting and email",
        body: [
          "Your domain is registered in your name unless you ask otherwise, hosting is either your own account or hosting we provide, and a website we build includes up to three business email addresses. The Domains and hosting tab explains each of them, including what happens when a domain is not renewed.",
        ],
      },
      {
        tab: "web",
        heading: "Online shops",
        body: [
          "For an online shop we upload up to 20 products at no charge. Uploading more than 20 is charged, from our price list, which we give you when you ask. Tell us early how many products you expect, so the quote is right.",
          "You give us the product details in the form we ask for: names, descriptions, prices, pictures and stock. We do not write or photograph products unless the scope says so.",
          "You are responsible for the accuracy of your products and prices, for what you sell being lawful to sell, for tax, delivery, stock, refunds and customer service. Payment providers set their own approvals, fees and rules, and may refuse or hold an account. We cannot promise their approval.",
        ],
      },
      {
        tab: "web",
        heading: "Platforms, plugins and updates",
        body: [
          "Websites are built on platforms, themes and plugins that belong to other companies and change over time. Updates can change how a site works. Updating and fixing after the warranty period are maintenance.",
          "A free review of your current site is advice. It is not a promise of results, and it is not a promise to be hired for the work.",
          "We do not promise search rankings, traffic or sales from a website. Search is its own service.",
        ],
      },
      {
        tab: "apps",
        heading: "Apps have a month of testing and review",
        body: [
          "A web app or mobile app cannot simply be handed over the way a content-managed site can, because real use shows things a plan does not. After the first release we give you up to one month of testing and review. During it you use the app, report what you find, and we fix what does not match the agreed scope.",
          "A defect is something that does not do what we agreed it would. A new idea, a new screen or a changed requirement is not a defect. It is new work, quoted before it starts. When the month ends, or earlier if you accept the app in writing, the build is complete and any warranty period in your scope begins.",
        ],
      },
      {
        tab: "apps",
        heading: "A first version comes first",
        body: [
          "We show you a first version, a prototype, before the full build. Changing direction after you approve it is new work. Tell us early who will use the app and what they must be able to do.",
        ],
      },
      {
        tab: "apps",
        heading: "Developer accounts and the stores",
        body: [
          "Unless you ask otherwise, the Apple and Google developer accounts are opened in our name. You may ask for the app to sit in your own account, or to be moved to it. A move depends on the store's rules and on your account meeting its requirements, may take time and fees and documents, and we only start it once your account with us is settled. Until then we keep the account secure, and you do not have the right to publish updates from it. We cannot promise that a store will approve a transfer.",
          "The stores decide whether an app is approved, and they change their rules at any time. We prepare each submission carefully. We cannot promise approval, a date, or that an app stays listed, and we are not responsible if a store refuses, removes or suspends an app or an account.",
        ],
      },
      {
        tab: "apps",
        heading: "Running costs and other companies",
        body: [
          "Apps often depend on services that charge for use, such as maps, messages, push notifications, payments, storage and AI. Their fees are yours, and we tell you which ones we use. Their terms can change, and a service can stop.",
          "We agree which devices and operating system versions the app supports. Support for other devices or for newer versions is new work.",
        ],
      },
      {
        tab: "apps",
        heading: "Your users and their data",
        body: [
          "If the app collects information about your users, you are responsible for the privacy notice, the terms, the consents and the lawful use of that information. The stores will ask for them. We will build in what is agreed and tell you what we notice.",
          "We do not build games, anything deceptive, or anything that needs unusual hardware.",
        ],
      },
      {
        tab: "software",
        heading: "How custom software and automation run",
        body: [
          "We agree what the system must do, build it in stages, and show you as we go. As with an app, real use shows things a plan does not, so the agreed scope sets a testing and review period after the first release. A defect is fixed within it. A new requirement is new work.",
          "Demonstrations of past work happen on a call. Very heavy or high-risk systems may be outside what we take on, and we say so early.",
        ],
      },
      {
        tab: "software",
        heading: "AI and your data",
        body: [
          "AI can be wrong. A person should check anything important it produces before anyone relies on it. You set the rules for your data, including what may be sent to an AI tool, and you are responsible for the lawful use of the system and its output.",
          "We do not promise that an AI tool will give a certain accuracy, result or saving.",
        ],
      },
      {
        tab: "software",
        heading: "Other companies' tools",
        body: [
          "Systems often connect to tools, interfaces and services that belong to other companies, and those can change, charge, limit or stop. We are not responsible for a change we do not control, and fixing around one is new work.",
        ],
      },
      {
        tab: "seo",
        heading: "What search work is",
        body: [
          "Search work starts at three months and runs on. It improves the chance people find you. It does not buy a position. Nobody can promise a ranking, and we do not.",
          "Results take time and depend on search engines, competitors, your market and what you do alongside our work. Search engines and AI answer tools change how they work without warning, and a change can lift or hurt results. We are not responsible for that.",
        ],
      },
      {
        tab: "seo",
        heading: "What we need from you",
        body: [
          "Access through each tool's own sharing settings, never by sending us a password. Timely approval of changes to your content before they go live. A site we can change, or the right person to make the change.",
          "If you or another developer change the site, the content or the settings during or after our work, that can undo or damage results. We are not responsible for changes we did not make.",
        ],
      },
      {
        tab: "seo",
        heading: "Links, content and penalties",
        body: [
          "We build links and mentions in ways search engines accept, and we do not buy spam links. If the site already carries a penalty or poor past work, such as bought links, copied content or hacked pages, the recovery is slower and uncertain, and we tell you what we find.",
          "You are responsible for the claims and facts in your content, and for having the right to use what you give us.",
        ],
      },
      {
        tab: "seo",
        heading: "Tools, reports and listings",
        body: [
          "Paid tools are paid by you unless we agree otherwise. We report on the schedule in your scope. Numbers from different tools differ, and we tell you which we use.",
          "A business listing, such as a Google Business Profile, stays yours. Platforms can suspend, merge or reject a listing. We are not responsible for a suspension, and we help you appeal where we can.",
          "Gains can fade if the work stops, because others keep working. Ending the work ends the effort, not the history of what was done.",
        ],
      },
      {
        tab: "social",
        heading: "Your accounts are yours",
        body: [
          "The accounts belong to you, and you add us through each platform's sharing tools. We never ask for a password. At the end of the work we are removed, and you remove any access you gave us.",
          "We are not responsible if an account is banned, suspended, restricted, limited, hacked, seized, locked, deleted or shadow-banned, or if its reach or following falls, whatever the cause. Platforms act on their own rules and can change them or act without warning. We follow their rules and tell you if we see a risk, but we cannot control or reverse their decisions.",
        ],
      },
      {
        tab: "social",
        heading: "Posting and approval",
        body: [
          "Nothing is posted until you approve it, within the time you told us. If approval does not arrive in time, the post is skipped or moved, and it is not posted without your approval. We plan the calendar, schedule the posts and suggest trends.",
          "You are responsible for what you ask us to say. Offers, prices, claims, promotions and competitions must be lawful and must follow platform rules. Tell us what must not be said.",
          "Pictures, video, music and trending sounds may carry licences. We use what you give us or what we are licensed to use. A copyright claim on something you supplied is yours to deal with.",
        ],
      },
      {
        tab: "social",
        heading: "Adverts and results",
        body: [
          "Ad spend is paid to the platform and is separate from our fee. Platforms approve, reject and restrict adverts at their own discretion, and ad accounts can be disabled. We cannot promise approval or how an ad or a post will perform. Reach, clicks and followers are not promised.",
          "Reports show what the platforms tell us. Their numbers can change or be wrong.",
        ],
      },
      {
        tab: "social",
        heading: "Comments, messages and your reputation",
        body: [
          "Unless the scope says we manage replies, answering comments, messages and complaints is yours. Where we do, we follow the guidelines you give us, and anything outside them comes to you. We are not responsible for what other people post or say about you.",
        ],
      },
      {
        heading: "Who we deal with, and on whose authority",
        body: [
          "You promise that you have the authority to agree this policy and the scope, for yourself or for the business you represent. We may rely on instructions from your named approver and treat them as yours. If someone else at your business gives instructions that conflict, we follow the approver and tell you.",
        ],
      },
      {
        heading: "Advice we do not give",
        body: [
          "We are a creative and technical studio. We do not give legal, tax, accounting, financial, medical or regulatory advice, and what we write or build is not that advice. You are responsible for the licences, permits, registrations and approvals your business needs, and for following the laws that apply to what you sell and say, including advertising, consumer protection, data protection and tax. Where it matters, take advice from someone qualified. We can point you to one.",
        ],
      },
      {
        heading: "Access and credentials you give us",
        body: [
          "You are responsible for giving us access safely, through each tool's own sharing or team settings and never by sending a password in a group chat or an open email, and for removing access when the work ends. A loss caused by a password or key that was shared insecurely, kept in an open place, or used by your staff or someone you gave it to is yours.",
        ],
      },
      {
        heading: "Silent and abandoned projects",
        body: [
          "If we cannot get what we need from you for thirty days, we may pause the project, and the dates move. If it is silent for sixty days, we may close it. Money paid for work already done, and deposits that reserved our time, are not refunded. If you want to restart after a closure, we may need to re-quote and start from a new slot.",
        ],
      },
      {
        heading: "How long we keep your files",
        body: [
          "We keep project files for up to twelve months after a project closes, and may delete them after that. Keep your own copies of what we hand over, because we do not promise to store it forever.",
        ],
      },
      {
        tab: "domains",
        heading: "Domains: whose name, and who renews",
        body: [
          "When we register a domain for you, we register it in your name and with your details, so you are the registrant and the owner, unless you ask in writing for something else. We use your real legal name and contact details, so keep them true and keep the email address reachable.",
          "Registries and registrars send verification emails and can suspend a domain whose contact details are not confirmed in time. Missing those emails is a common cause of a site going offline, and it is not something we can prevent if the address is wrong or unread.",
          "A domain is rented, not bought outright. You are responsible for renewing it. If we manage your domain for you, we aim to remind you before it renews and we renew it when you have paid, but renewal is not done until it is paid for.",
        ],
      },
      {
        tab: "domains",
        heading: "If a domain is not renewed on time",
        body: [
          "When a domain's term ends without a successful renewal, it does not vanish at once, but things happen in stages that are set by the registry and the registrar, not by us. First comes the renewal date. Many registrars then try an automatic renewal, which can fail if a card has expired or been declined. After expiry there is usually a grace period in which the website and email may already stop working, and renewing is still possible at the normal price.",
          "After that there is often a redemption period in which the domain can still be recovered, but only by paying a penalty fee that can be several times the normal price, and recovery can take days. After that the domain is deleted and released, and anyone can register it, including a competitor.",
          "The length of each stage and the fees differ by registrar and by extension, such as .com, .ng and .com.ng, and they can change. They are outside our control. If a domain, a website or an email address is lost or interrupted because a renewal was not paid or approved, a card failed, contact details were wrong, or a verification email was not answered, the loss and any recovery fees are yours and not ours. Where we agreed to renew a domain and you paid in time, we will tell you what happened and help you recover it.",
        ],
      },
      {
        tab: "domains",
        heading: "DNS, transfers and changes",
        body: [
          "Changes to where a domain points can take hours, and sometimes up to two days, to reach everyone. A newly registered or newly transferred domain can usually not be moved to another registrar for a period, commonly sixty days. A transfer needs an authorisation code from the current registrar, and some registrars charge for it. We help where we can, and we do not hold a domain registered in your name.",
          "Email delivery depends on settings on the domain. Changing them without us can stop your email from sending or arriving.",
        ],
      },
      {
        tab: "domains",
        heading: "Hosting: your own account, or ours",
        body: [
          "Hosting is one of two things, and your agreed scope says which. Either we open a hosting account for you in your own name, with you as the account holder and the payer, and hand you the access, or we host the site on our own hosting. Hosting we provide is on the terms in this tab, together with the fee and renewal date in your scope.",
          "Where we host for you, we look after the servers with reasonable care, apply the security and platform updates that come with the service, and monitor the site. We aim for it to be available, but we do not promise it will never be down.",
        ],
      },
      {
        tab: "domains",
        heading: "Backups for the sites we manage",
        body: [
          "For the sites we host and manage for you, we take regular backups, and we keep them to up to one week of recency. If something goes wrong with the site, we can restore it to a point within the last week.",
          "A backup is there for a loss or a fault, not as an undo button for every change. A restore can take time, and anything added after the point we restore to is lost. Backups from before the last week are not promised. Backups sit with our hosting, so keep your own copy of anything you cannot afford to lose, such as your product list or customer records.",
        ],
      },
      {
        tab: "domains",
        heading: "What comes with hosting we provide",
        body: [
          "While a site is with us, you have regular backups, security and platform updates for the hosting, monitoring, up to three business email addresses with a website we build, and help moving the site when you leave. Anything beyond that, such as redesigns, new features, content updates or clearing up after a hack, is maintenance or new work and is quoted.",
        ],
      },
      {
        tab: "domains",
        heading: "When hosting can be suspended",
        body: [
          "We may suspend or limit hosting, and tell you when we can, if fees stay unpaid after written notice; if the site is hacked, infected or a risk to others; if it sends spam or holds unlawful content; if it uses so many resources that it harms other sites; if a court, regulator or complaint requires it; or if our own provider takes action. We lift a suspension when the cause is fixed and anything owed is paid. Where security is at risk we may act first and tell you right after.",
          "We do not hold a domain or an account in your name hostage. Those stay yours, and we help you move your site once your account with us is settled.",
        ],
      },
      {
        tab: "domains",
        heading: "Outages and what is outside our control",
        body: [
          "A site can go down for reasons we do not control, such as a fault at a data centre or network provider, an attack, a domain that expired, a payment that did not renew, a problem with a plugin or theme, or a third-party service that stopped. We are not responsible for loss caused by those. A site that is hacked because of a weak or shared password, a plugin you installed, or software you chose not to update is the same.",
          "Platforms, themes and plugins belong to other companies, free ones come with their own licences, and paid ones renew on the owner's terms. A licence you do not renew can stop an update or a feature. We tell you which ones your site uses.",
        ],
      },
      {
        tab: "domains",
        heading: "Business email",
        body: [
          "A website we build includes up to three business email addresses at no charge, for as long as the domain and the hosting stay active. More than three are charged per mailbox. Your handover document lists what you have.",
          "A mailbox is for ordinary business mail. Storage and sending limits apply, bulk and unsolicited email is not allowed, and receiving servers may treat your mail as spam through no fault of ours, so delivery is not guaranteed. You own what is in your mailboxes. Keep your own copies of anything important, and keep passwords private. When hosting ends, mailboxes end with it, after notice.",
        ],
      },
      {
        tab: "domains",
        heading: "Moving away and ending hosting",
        body: [
          "Either of us may end a hosting arrangement by giving thirty days' written notice. Fees are due for the period used, and a fee already paid is not refunded unless we ended it without cause. Before it ends we give you your files and database in a standard form once your account with us is settled, and we may charge for the time a move takes. After hosting ends we keep a copy for a short time in case you need it, and then delete it.",
        ],
      },
      {
        tab: "domains",
        heading: "What you cover for domains and hosting",
        body: [
          "You are responsible for the content on what we host, for the licences it needs, for the personal information on it, and for renewing what is yours to renew. You agree to cover us for any claim, loss or cost that comes from your content, from your use of the hosting or email against this policy, or from your failure to pay for or renew something that was yours, as set out in the general terms of this policy.",
        ],
      },
      {
        tab: "payments",
        heading: "Your payment accounts are yours",
        body: [
          "When your site or app takes payments, the account with a payment provider such as Paystack or Flutterwave is opened in your name, by you, and the money goes to your account. We do not hold, touch or move your money. The provider decides whether to approve you, what it asks for, its fees, how fast money is settled, and when it holds or reverses a payment. We cannot promise approval.",
        ],
      },
      {
        tab: "payments",
        heading: "We walk you through it",
        body: [
          "We explain how to open and set up each channel, what you must have ready, and where things are in your account. Typically that is your business registration, a business bank account, the identity documents of the owners, and a working website with your contact details and a refund policy, because providers often ask to see them. We explain how to add us as a developer where the provider has team or developer roles, and how to find your public and secret keys, your webhook address and secret, and your callback address.",
          "You do the steps in your own account, because it is your account and your identity checks. We guide you on a call or in a short written guide, and we answer questions as you go.",
        ],
      },
      {
        tab: "payments",
        heading: "Keys and secrets",
        body: [
          "Keys and webhook secrets are like passwords for your money. Give us only what we need, through the provider's own team or developer access where it exists, or another private way, and never in a group chat or an open email. We keep them as protected settings in your project, not in the code that visitors can see. After handover, you should rotate or revoke any key you shared. A loss caused by a key that was shared insecurely, left in an open place or used by your staff is yours.",
        ],
      },
      {
        tab: "payments",
        heading: "Testing and going live",
        body: [
          "We build and test in the provider's test mode first. Real money is used only when you approve going live. You check that payments reach your account and that the amounts and receipts are right, and tell us if they are not. After go-live, a problem with the way we built it is a defect. A change by the provider, or a change you make in your account, is not.",
        ],
      },
      {
        tab: "payments",
        heading: "What the provider decides",
        body: [
          "Providers approve, limit, hold, review and close accounts at their own discretion. They handle disputes, chargebacks and fraud checks, set fees, change their interfaces, and can stop a feature. We build to their current documented method. We are not responsible for a decision, hold, fee, chargeback or change that is theirs.",
        ],
      },
      {
        tab: "payments",
        heading: "Your duties as a seller",
        body: [
          "You are responsible for your prices, your refund and delivery terms, your privacy notice, your tax and your compliance with the rules that apply to selling and to taking payments, including identity checks the provider asks of you. We do not give legal, tax or financial advice. Customer service, refunds and disputes with your customers are yours.",
        ],
      },
      {
        tab: "payments",
        heading: "Other services we connect",
        body: [
          "The same applies to delivery companies, SMS and email senders, maps, analytics and accounting tools. The account is in your name, its fees are yours, we explain how to set it up, and its terms and prices can change without our control.",
        ],
      },
      {
        heading: "Changes to this policy",
        body: [
          "A change to this page does not change an engagement already agreed. It applies to the next one, unless you accept it sooner.",
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "payments-and-refunds",
    title: "Payments and Refunds Policy",
    blurb:
      "How deposits and invoices work, how you pay, what happens when you pay late, and when money is returned.",
    updated: LEGAL_UPDATED,
    intro:
      "This policy explains how we charge, how you pay, and when we return money. It sits beside the Client Engagement Policy. The amounts and dates for your project are in your agreed scope, and if that says something different, it wins.",
    sections: [
      {
        heading: "How we charge",
        body: [
          "Each project is priced in the agreed scope, in the currency stated there. Most projects are charged as a deposit to start, then stages, then a final payment on delivery. Ongoing work is charged monthly in advance.",
          "Prices do not include third-party costs such as domains, hosting, licences, app store accounts and advertising spend. We tell you about those before they are incurred. Some work has a stated allowance, for example up to 20 products uploaded to an online shop, and anything beyond it is charged from our price list.",
          "Taxes are added where the law requires and are shown on the invoice.",
          "Some things are charged repeatedly: hosting we provide, maintenance, any mailbox beyond the three included with a website we build, and ongoing work. Each is shown on your agreed scope, with its price and renewal date, and is charged in advance. Domains, licences and store accounts renew with the company that provides them, on their terms, and you pay those costs.",
        ],
      },
      {
        heading: "How you pay",
        body: [
          "Invoices and receipts are issued through the client portal and by email. You can pay by card or bank transfer through our payment provider from the link on the invoice, or by direct bank transfer to the account on it. Always use the account details on an invoice you received from our official address, and if a message tells you our bank details have changed, call us first.",
          "We do not see or store your card details. The payment provider handles them. Their fees are not added to your invoice.",
          "A payment is counted when we have it, and we send a receipt. A transfer that you have made but that has not reached us is not yet a payment.",
        ],
      },
      {
        heading: "Deposits",
        body: [
          "The deposit reserves the time of the team and starts the work. It is not a down payment on a fixed outcome, and the date work starts depends on it being paid.",
          "Work on the next stage starts when the stage before it has been paid for. Final files are released on final payment.",
        ],
      },
      {
        heading: "Paying late",
        body: [
          "An invoice is due by the date on it. A reminder is sent before and after. If an invoice is significantly overdue we may pause the work and tell you first. The delivery dates move by the length of the pause. Where we host your site or mailboxes, we may suspend that hosting after written notice if the fees stay unpaid, and we will restore it once they are paid. We do not hold a domain registered in your name, or an account that is in your name, hostage: those stay yours, and we will help you move your site after your account is settled.",
          "If a bill is wrong, tell us straight away and we will fix it. The undisputed part is still due.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Money paid for work already done is not refunded: design time, build time, and costs already committed to other companies are spent when they are used.",
          "If you end an engagement before it starts, you get back what you paid except for any costs already committed to others and for time already spent on discovery, which we show you.",
          "If you end it part way, the deposit and stage payments cover the work done up to that date. We refund any payment received for a stage that has not started, less committed costs. We will show the working.",
          "If we cannot deliver what we agreed, or we end the engagement for a reason that is ours, you are refunded the part of the fee for work that has not been delivered.",
          "A refund is a separate record from the original payment. We send it back by the channel it came in, and you will see it in your portal. The time it takes to arrive depends on the bank or payment provider and is outside our control.",
        ],
      },
      {
        heading: "Monthly and ongoing work",
        body: [
          "Monthly work is charged in advance for the month and renews until it is ended. You can end it by telling us in writing before the next charge date. We do not refund a month that has started. Where a minimum term was agreed, it applies.",
        ],
      },
      {
        heading: "Disputes about a payment",
        body: [
          `If you do not recognise a charge, write to ${CONTACT_EMAIL} before taking it up with your bank, and we will explain it or correct it quickly. A bank dispute on a valid charge can pause your work.`,
        ],
      },
      {
        heading: "Changes",
        body: [
          "A change to this page does not change an engagement already agreed.",
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "messages-and-reminders",
    title: "Messages and Reminders Policy",
    blurb:
      "What we email you, when, why, and how to switch each kind off.",
    updated: LEGAL_UPDATED,
    intro:
      "We would rather send you fewer emails than more. This page lists every kind of message the system sends, so none of them is a surprise, and says how to stop the ones you can stop.",
    sections: [
      {
        heading: "Messages you need",
        body: [
          "Receipts and confirmations. When you send a form, we reply to say it arrived. When you pay, we send a receipt. When you book a call, we confirm the time.",
          "Account and security messages. Sign-in links, password resets and warnings about unusual activity on your account. These are sent for your safety, so they cannot be switched off while you hold an account.",
          "Project messages. Updates, approvals needed from you, invoices and delivery notes for the work we are doing together. They are part of the work. If you do not want a particular one, tell us and we will agree how else to reach you.",
        ],
      },
      {
        heading: "Reminders about an unfinished brief",
        body: [
          "If you start an onboarding brief, leave your email and do not finish it, we may remind you. We send at most two reminders, spaced out, and none after you submit. Each includes a link that switches reminders off in one tap, with no sign-in. The reminders stop once you use it, and are not sent again.",
          "A pre-filled link sent to you by our team lets you continue where our team stopped. It works for a limited time and then stops.",
        ],
      },
      {
        heading: "Newsletters and marketing",
        body: [
          "We send news, articles or offers only to people who asked for them, and each one carries an unsubscribe link. Unsubscribing takes effect at once. We keep your address on a suppression list so we do not add you again by mistake.",
        ],
      },
      {
        heading: "What we do not do",
        body: [
          "We do not sell or share your address for someone else's marketing. We do not send messages to anonymous or throwaway addresses, and we turn those away on our forms. We do not ask for passwords or card numbers by email, and a message that asks for them did not come from us.",
        ],
      },
      {
        heading: "How we record messages",
        body: [
          "To avoid sending the same message twice and to answer whether a message reached you, we keep a record of each message sent: who it went to, what kind it was, the time, and whether it was delivered. These records are kept for a limited period and then deleted.",
        ],
      },
      {
        heading: "Changing your mind",
        body: [
          `Use the link in any message, change your settings in the portal where they are offered, or write to ${CONTACT_EMAIL} and we will do it for you. Switching one kind off does not switch off the messages you need to run an account or a project.`,
        ],
      },
    ],
  },
];

/**
 * Facts a director or lawyer has to supply before this set is fully complete.
 * Listed rather than invented: every one of these is a statement about the
 * legal entity, and a wrong one in a published policy is worse than an absent
 * one. Nothing here blocks the pages from being useful today.
 */
export const OPEN_ITEMS = [
  "Registered office address, which most privacy regimes expect a controller to publish.",
  "A telephone number, if one should be given as a contact route alongside email.",
  "Whether a named Data Protection Officer or contact has been appointed under the NDPA.",
  "Confirmation of the retention periods. The onboarding-draft default (180 days) and the invitation period (90 days) match what the system does today, and are editable under Settings. The enquiry period is not fixed, and the six-year project period is a drafted default.",
  "The Payments and Refunds Policy: confirm the payment methods offered, that monthly work is billed in advance, the overdue reminders, and when deposits are refundable. These are drafted as sensible defaults and not from a signed agreement.",
  "A limit on liability and a mediation step, which are drafted in plain words and need a lawyer's wording.",
  "Whether the accessibility menu, chat assistant and any analytics added later are described correctly in the Cookie Policy.",
  "The Domains and hosting and Payments and integrations tabs of the Client Engagement Policy: confirm the one-week backup promise, the suspension grounds, the thirty-day notice period, the twelve-month file retention, and the app account default.",
  "The service tabs of the Client Engagement Policy: confirm the revision limits (one revision for a logo, flyer or social design; one direction for a brand guide), the one-month testing period for apps, the 20 free products, and the account ban and seizure wording for social and search.",
  "A practitioner's review of the whole set, especially liability, intellectual property, refunds and engagement, before it is relied on commercially.",
] as const;

export const legalBySlug = (slug: string): LegalDoc | undefined =>
  LEGAL_DOCS.find((d) => d.slug === slug);
