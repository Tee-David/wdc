import { COMPANY_NAME, CONTACT_EMAIL, SITE_URL } from "@/lib/site";

/**
 * The legal documents.
 *
 * WRITTEN FOR WDC, NOT COPIED. The brief pointed at another agency's policy
 * pages as a model for SHAPE, and shape is all that was taken: four documents,
 * a contents rail, plain headings. The words are written here for this
 * company, and they had to be, twice over. Policy text is a copyrighted work
 * like any other, so lifting it is an infringement; and more to the point a
 * privacy policy is a set of promises about what a specific business actually
 * does with data. Copying another firm's promises means publishing statements
 * about WDC that nobody has checked are true. Everything below describes how
 * this site and this studio actually operate.
 *
 * WHAT IS DELIBERATELY NOT HERE. No company registration number, no registered
 * office address, no named Data Protection Officer, no supervisory-authority
 * registration number. Those are facts about the legal entity that we do not
 * have, and a legal page is the last place to guess at one: an invented RC
 * number is a false statement in a published document. Where such a detail
 * belongs, the text points at the contact address instead, which is real.
 * `OPEN_ITEMS` at the bottom lists what a lawyer or director should fill in.
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

/** One date for the set, so four documents cannot disagree about their age. */
export const LEGAL_UPDATED = "11 September 2026";

export type LegalSection = { heading: string; body: string[] };

export type LegalDoc = {
  slug: string;
  title: string;
  /** Shown on the index card and in the page's meta description. */
  blurb: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export const LEGAL_DOCS: LegalDoc[] = [
  /* ------------------------------------------------------------------ */
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    blurb:
      "What personal information we collect, why we hold it, how long we keep it, and the rights you have over it.",
    updated: LEGAL_UPDATED,
    intro: `This policy explains what personal information ${COMPANY_NAME} collects when you use this website or work with us, what we do with it, and what you can ask us to do about it. It is written to be read, not to be survived.`,
    sections: [
      {
        heading: "Who we are",
        body: [
          `${COMPANY_NAME} is a creative and digital agency operating from Nigeria. We design brands, build websites, applications and software, and run search, social and paid campaigns for our clients.`,
          `For the information described in this policy we are the data controller, which means we decide why it is held and what happens to it. You can reach us about anything in this document at ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: "What we collect",
        body: [
          "Information you give us. When you send an enquiry, ask for a quote, or brief us on a project, you give us your name, your email address, sometimes a phone number and a company name, and whatever you choose to write in the message. If we go on to work together, we hold the contract, the brief, the correspondence, and the invoicing details needed to bill and be paid.",
          "Information we are given as part of the work. Delivering a project often means being handed access to something that belongs to you: a hosting account, an analytics property, an advertising account, a content management system, a social media profile, a brand archive. These may contain personal data belonging to you, your staff or your customers. We treat all of it as yours, not ours.",
          "Information collected automatically. Our hosting provider records ordinary server information when a page is requested, including an IP address, the page, a timestamp, and the browser and device reported by the request. This is standard for any website and is used to keep the site running and secure.",
          "We do not ask for and do not want payment card numbers, government identity numbers, health information, or anything else sensitive. Please do not send them to us by email.",
        ],
      },
      {
        heading: "Why we hold it, and on what basis",
        body: [
          "To answer you. An enquiry cannot be replied to without a reply address. Our basis is your request, and the legitimate interest both parties have in the conversation happening.",
          "To deliver an engagement. Once a project is agreed, we process what the work requires under the contract between us.",
          "To meet obligations. Invoices, records of payment and tax records are kept because the law requires them, not because we want them.",
          "To keep the site working and safe. Server logs and security measures rest on our legitimate interest in running a site that is available and not being attacked.",
          "If we ever want to use your information for something outside these, such as putting your name on a mailing list, we will ask you first and you will be able to say no without it affecting anything else.",
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
          "Some of it necessarily passes through the suppliers who let us operate: the company that hosts this website, the provider that carries our email, the tools we use to write, design, store files and track project work, and the payment and accounting services that handle billing. Each sees only what their part of the job needs.",
          "A client's own accounts, such as an advertising platform or an analytics property, are reached with credentials the client controls and can revoke at any time.",
          "We will disclose information where a law, a court or a regulator with proper authority requires it. If that ever happens and we are permitted to tell you, we will.",
        ],
      },
      {
        heading: "Leaving Nigeria",
        body: [
          "Several of the services above operate outside Nigeria, so some information is stored or processed abroad. Where that happens we use established providers whose contractual terms commit them to protecting the data and to restricting what they may do with it.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "An enquiry that does not become a project is kept for up to twenty-four months, so that we can pick up a conversation that restarts, and then deleted.",
          "Project records are kept for the life of the engagement and for six years afterwards, which is the period in which a contractual question could still arise.",
          "Financial records are kept for as long as Nigerian tax and company law requires.",
          "Access credentials and client account access are given up at the end of an engagement. If we still hold an access we no longer need, ask and we will remove it.",
        ],
      },
      {
        heading: "How it is protected",
        body: [
          "This site is served over HTTPS. Access to client accounts and project systems is limited to the people working on that engagement, and shared credentials are avoided in favour of individual access that can be withdrawn.",
          "We will not pretend to be impregnable. No website or company is, and a policy that claims otherwise is not being straight with you. What we can say is that we take reasonable measures, we keep the number of people who can reach your data small, and if a breach ever affects your personal information we will tell you and the regulator as the Nigeria Data Protection Act requires.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Under the Nigeria Data Protection Act 2023 you may ask us for a copy of the personal information we hold about you, ask us to correct it if it is wrong, ask us to delete it where we have no continuing reason to keep it, ask us to restrict what we do with it while a dispute is resolved, object to processing we are carrying out on the basis of legitimate interest, and ask for your information in a portable form.",
          `Write to ${CONTACT_EMAIL} and we will respond within thirty days. There is no charge. If we cannot do what you have asked, we will tell you why rather than simply declining.`,
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
      "The terms on which this website is offered, what the content on it does and does not amount to, and who owns what.",
    updated: LEGAL_UPDATED,
    intro: `These terms govern your use of ${SITE_URL} and the material published on it. Using the site means accepting them. The terms of an actual project are separate and are set out in the Client Engagement Policy and in the agreement we sign with you.`,
    sections: [
      {
        heading: "Using the site",
        body: [
          "You are welcome to read, link to and share what is published here. You agree not to use the site unlawfully, not to attempt to gain access to any part of it you have not been given, not to introduce anything malicious, and not to take action that would interfere with it working for other people.",
          "Automated collection of the site's content at a scale that burdens the server, or for the purpose of reproducing it elsewhere, is not permitted.",
        ],
      },
      {
        heading: "What the site is not",
        body: [
          "Everything published here, including case studies, articles and service descriptions, is general information about what we do. It is not advice for your particular situation, and it is not an offer capable of acceptance.",
          "A description of work we delivered for one client is a record of that engagement. It is not a prediction of what the same approach would achieve for you, and nothing on this site should be read as a guarantee of any commercial result.",
          "No client relationship, and no obligation on our part, comes into existence until we have agreed an engagement in writing.",
        ],
      },
      {
        heading: "Our intellectual property",
        body: [
          `The design, code, text, layout and original graphics of this site belong to ${COMPANY_NAME} and are protected by copyright. The name We Dig Creativity, the WDC mark and our logo are ours.`,
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
        heading: "Links out",
        body: [
          "We link to client sites and to third-party tools. Those sites are not ours, we do not control what they publish, and a link is not an endorsement of everything on the other end of it.",
        ],
      },
      {
        heading: "Availability",
        body: [
          "We try to keep this site up and correct. We do not promise that it will be available without interruption, or that everything on it is complete and current at every moment. We may change, move or withdraw any part of it.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "To the extent the law allows, we are not liable for loss arising from your use of this website or from reliance on general information published on it, including loss of profit, business or data.",
          "Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be limited. Liability arising out of an actual engagement is governed by that engagement's own agreement, not by this page.",
        ],
      },
      {
        heading: "Governing law",
        body: [
          "These terms are governed by the laws of the Federal Republic of Nigeria, and the Nigerian courts have jurisdiction over any dispute arising from them.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We may update these terms. The version published here, with the date at the top of the page, is the one that applies.",
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
      "What this site stores in your browser, what it is for, and how to clear it.",
    updated: LEGAL_UPDATED,
    intro:
      "This policy describes what this website stores on your device and why. It is short, because this site stores very little.",
    sections: [
      {
        heading: "What a cookie is",
        body: [
          "A cookie is a small file a website asks your browser to keep, so that something can be remembered between pages or between visits. Related technologies such as local storage do the same job by a different mechanism, and everything below applies to those too.",
        ],
      },
      {
        heading: "What this site stores",
        body: [
          "A theme preference. When you switch between light and dark, that choice is written to your browser's local storage so the site does not start in the wrong one next time. It stays on your device, it is not sent to us, and it identifies nothing about you.",
          "Ordinary session and security data set by our hosting platform to serve pages and protect the site from abuse.",
          "That is the whole list. This site does not run advertising trackers, does not fingerprint your device, and does not embed third-party marketing pixels.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "Where we measure how the site is used, we do so in aggregate to understand which pages are useful, and we do not use it to build a profile of an individual visitor or to target advertising at you.",
        ],
      },
      {
        heading: "Things we embed",
        body: [
          "Some pages load resources from other services, such as fonts and, on our work pages, a preview frame showing a client's live site. Loading a resource from another service tells that service your IP address, because it has to in order to send the file back. Their handling of that request is governed by their own policies.",
        ],
      },
      {
        heading: "Your control",
        body: [
          "Every browser lets you view, block and delete cookies and site data, usually under privacy or site settings. Clearing them for this site removes the theme preference, and the site will follow your system setting again. Nothing else about the site depends on storage, so blocking it will not break anything here.",
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
    blurb:
      "How a project starts, what each side is responsible for, who owns the work, and how an engagement ends.",
    updated: LEGAL_UPDATED,
    intro:
      "This policy sets out how we work with clients: how an engagement begins, what we each commit to, who owns what at the end, and what happens when something goes wrong. It is the standard we hold ourselves to. Where a signed agreement for your project says something different, that agreement wins.",
    sections: [
      {
        heading: "How an engagement begins",
        body: [
          "It begins with a conversation about the outcome you want, not a feature list. We would rather understand what the work has to achieve than quote for a specification that may not get you there.",
          "We then put the scope in writing: what is included, what is not, what we need from you, what it costs, and roughly when. Work starts when that is agreed and any deposit is settled. Nothing said in a meeting or an email thread changes the agreed scope until it is written down and both sides have accepted it.",
        ],
      },
      {
        heading: "What we commit to",
        body: [
          "To tell you the truth about the work, including when something we recommended has not worked, when a deadline is going to move, and when you do not need the thing you have asked for.",
          "To deliver to the scope we agreed, at the standard the work is described at, and to keep you included as it happens rather than presenting a finished thing at the end.",
          "To keep what we learn about your business confidential, and to treat any access you give us as yours, used only for the work and given up when it ends.",
          "To be reachable, and to answer the same working day where we can.",
        ],
      },
      {
        heading: "What we need from you",
        body: [
          "A single person who can make decisions and give approvals. Projects slow down most often because feedback arrives from several directions and contradicts itself.",
          "Content, assets, access and answers when they are needed. Much of what we build cannot be finished around missing material, and waiting for it moves the delivery date rather than compressing the work.",
          "Feedback within the window we agree at each review stage. If it does not arrive, the timeline moves by the same amount.",
          "That you have the right to give us what you give us. Copy, images, fonts and trademarks handed to us are used on the basis that you are entitled to use them.",
        ],
      },
      {
        heading: "Revisions and changes of mind",
        body: [
          "Every stage includes review and revision. That is part of the work, not an extra.",
          "A change of direction is different from a revision. Re-doing something already approved, or adding to the agreed scope, is new work: we will say so at the time, price it, and wait for your agreement before starting. We will not quietly absorb it and we will not quietly invoice for it.",
        ],
      },
      {
        heading: "Timelines",
        body: [
          "Dates given at the start are estimates based on the scope as agreed and on material arriving when expected. We will tell you as soon as we know a date is at risk, with the reason and the new date, rather than at the point it is missed.",
        ],
      },
      {
        heading: "Fees and payment",
        body: [
          "Fees, the schedule and the currency are set out in the proposal. Projects normally start with a deposit, with the balance tied to stages or to delivery.",
          "Invoices are due within the period stated on them. Where payment is significantly overdue we may pause work, and we will tell you before we do rather than simply stopping.",
          "Third-party costs such as domains, hosting, licences, stock or advertising spend are yours and are separate from our fees. We will identify them before they are incurred.",
        ],
      },
      {
        heading: "Who owns the work",
        body: [
          "On final payment, ownership of the final deliverables created specifically for you passes to you: the brand marks, the design files, the copy we wrote for you, and the custom code written for your project.",
          "Some things cannot pass, because they were never ours to give. Third-party components, open-source libraries, licensed fonts and stock images remain with their owners and reach you under their own licences, which we will identify. Our own general tooling, internal libraries and working methods stay ours, and using them for you does not transfer them.",
          "Concepts that were presented and not selected remain ours.",
        ],
      },
      {
        heading: "Showing the work",
        body: [
          "Unless you ask us not to, we may show completed work in our portfolio and describe what it involved. If a project is confidential, or you would rather it were not shown, say so and it will not be.",
        ],
      },
      {
        heading: "Confidentiality",
        body: [
          "What you tell us about your business stays with the people working on your project. This holds after the engagement ends. We will sign your non-disclosure agreement if you have one.",
        ],
      },
      {
        heading: "After launch",
        body: [
          "Delivery includes handover: the files, the access, and an explanation of how what we built works.",
          "Software and websites need maintenance, and campaigns need running. Those are separate arrangements and we will tell you honestly which ones you actually need rather than selling a retainer by default.",
          "Where we agreed a warranty period, defects in what we built are fixed within it at no charge. A defect means it does not do what we agreed it would. A new requirement is not a defect.",
        ],
      },
      {
        heading: "Ending an engagement",
        body: [
          "Either side may end an engagement in writing. You pay for the work done and the costs committed up to that point, and we hand over what has been paid for.",
          "If we are the reason it has ended, we will not hold finished work you have already paid for.",
        ],
      },
      {
        heading: "When something goes wrong",
        body: [
          `Tell us. Write to ${CONTACT_EMAIL} or speak to whoever you have been dealing with, and we will respond within five working days with what we intend to do about it.`,
          "We would far rather fix a problem than have you live with it or hear about it from somebody else. Where we have got something wrong, we will say so plainly.",
        ],
      },
      {
        heading: "Governing law",
        body: [
          "Engagements are governed by the laws of the Federal Republic of Nigeria unless the signed agreement for your project says otherwise. We will try to resolve any dispute by discussion before either side takes it further.",
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
  "Registered company name and RC number, for the Privacy Policy's 'Who we are' and the Terms' ownership section.",
  "Registered office address, which most privacy regimes expect a controller to publish.",
  "A telephone number, if one should be given as a contact route alongside email.",
  "Whether a named Data Protection Officer or contact has been appointed under the NDPA.",
  "Confirmation of the retention periods, which are drafted as sensible defaults rather than from an existing schedule.",
  "A practitioner's review of the liability, intellectual property and engagement sections before they are relied on commercially.",
] as const;

export const legalBySlug = (slug: string): LegalDoc | undefined =>
  LEGAL_DOCS.find((d) => d.slug === slug);
