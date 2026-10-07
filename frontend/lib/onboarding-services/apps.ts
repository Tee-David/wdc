import { UNSURE, type Cond, type Step } from "../onboarding-shared";

/**
 * The Apps form, Size first, after the UX research
 * (plans/onboarding-ux-research.md, E4).
 *
 * Small is four things: where it runs, where you are with it, its one job and
 * the features. The feature list is searchable and grouped, with eight popular
 * ones shown first and about thirty in all. Who uses it, offline, what it
 * connects to and the store accounts open at a medium app. The rest is for a
 * large one. There is no budget question: scope and budget were agreed before
 * this form.
 */

export const SIZE_KEY = "app_size";

const PHONE = "iPhone";
const ANDROID = "Android phone";

/** Thirty three features in ten groups. The old payments question lives here now. */
export const FEATURE_GROUPS: { name: string; options: string[] }[] = [
  { name: "Accounts", options: ["Sign up and log in", "Profiles", "Roles and permissions"] },
  { name: "Payments", options: ["Take payments", "Subscriptions", "Wallet or credits", "Invoices and receipts"] },
  { name: "Chat and community", options: ["Messaging", "Group chat", "Comments and likes", "Voice or video calls"] },
  { name: "Maps and places", options: ["Maps and places near me", "Live location and delivery tracking", "Bookings by place"] },
  { name: "Notifications", options: ["Push notifications", "Email, SMS and WhatsApp alerts"] },
  { name: "Offline and speed", options: ["Works offline and syncs", "Live updates", "Installs from the browser"] },
  { name: "Content and files", options: ["Photos and video upload", "Search", "Feeds and lists", "Documents and files", "Reads text aloud"] },
  { name: "Admin and data", options: ["Admin panel", "Reports and charts", "Import and export data", "History of who changed what"] },
  { name: "Smart features", options: ["AI assistant", "Scan with the camera", "QR codes and barcodes"] },
  { name: "Other", options: ["More than one language", "Something else"] },
];

export const POPULAR_FEATURES = [
  "Sign up and log in", "Profiles", "Take payments", "Push notifications",
  "Messaging", "Admin panel", "Photos and video upload", "Search",
];

const MID: Cond = { tier: 2 };
const BIG: Cond = { tier: 3 };
const onPhone: Cond = { key: "platforms", equals: [PHONE, ANDROID] };

export const APPS_STEPS: Step[] = [
  {
    phase: "work", id: "apps", service: "apps", title: "Tell us about the app",
    blurb: "Where it runs, and what it is for.",
    fields: [
      {
        key: "n_kind", kind: "notice", label: "Before we start",
        hint: "We do not build games, anything deceptive, or apps that need heavy hardware. Everything else, tell us about it.",
      },
      {
        key: SIZE_KEY, assist: true, required: true, kind: "cards",
        label: "How big is the app?",
        hint: "A rough feel is enough. We confirm it later.",
        options: ["Small", "Medium", "Large"],
        optionInfo: {
          Small: { desc: "One main job and a handful of screens." },
          Medium: { desc: "Several jobs, accounts and a few connections." },
          Large: { desc: "A full product with roles, payments and an admin side." },
        },
      },
      {
        key: "platforms", assist: true, required: true, kind: "multi",
        label: "Where will people use it?",
        hint: "Pick all that apply. We can build for several from one shared base.",
        options: [PHONE, ANDROID, "Web browser", "Desktop"],
      },
      {
        key: "app_stage", assist: true, required: true, kind: "cards",
        label: "Where are you with the app today?",
        options: ["Only an idea", "Designs are ready", "A prototype exists", "An app to rebuild or extend"],
      },
      {
        key: "app_existing", kind: "text", label: "Where can we see the app today?",
        placeholder: "A store link or a web address",
        showIf: { key: "app_stage", equals: ["An app to rebuild or extend"] },
      },
      {
        key: "app_files", kind: "upload", label: "Upload your designs or prototype",
        showIf: { key: "app_stage", equals: ["Designs are ready", "A prototype exists"] },
      },
      {
        key: "one_job", assist: true, required: true, kind: "text",
        label: "In one sentence, what is the main job of the app?",
        example: "job",
      },
    ],
  },
  {
    phase: "work", id: "apps_features", service: "apps", title: "What the app does",
    blurb: "Pick the features you need. We confirm the list with you.",
    fields: [
      {
        key: "app_features", assist: true, kind: "multi",
        label: "Which features do you need?",
        hint: "Search or scroll. Pick everything that sounds right.",
        groups: FEATURE_GROUPS, popular: POPULAR_FEATURES,
        options: FEATURE_GROUPS.flatMap((g) => g.options),
      },
      {
        key: "n_proto", kind: "notice", label: "A first version comes first",
        hint: "We show you a first version, called a prototype, before the full build. You can change direction early.",
      },
    ],
  },
  {
    phase: "work", id: "apps_setup", service: "apps", title: "Who uses it, and what it connects to",
    blurb: "People first, then the tools it has to talk to.",
    fields: [
      {
        key: "app_roles", assist: true, kind: "multi",
        label: "Who will use the app?",
        options: ["Customers", "Staff", "Owner or admin", "Drivers or agents", "Vendors", "Other"],
        showIf: MID,
      },
      {
        key: "accounts", label: "Anything each person must or must not be able to do?", kind: "textarea",
        placeholder: "For example: customers place orders, staff update them",
        showIf: MID,
      },
      {
        key: "offline", assist: true, kind: "cards", label: "Must it work without a connection?",
        options: ["Yes", "Only some parts", "No"],
        showIf: MID,
      },
      {
        key: "app_connects", assist: true, kind: "multi",
        label: "Is there anything it must connect to?",
        options: ["WhatsApp", "Paystack", "Flutterwave", "Google Sheets", "Accounting software", "A database I have", "Other", "Not sure"],
        showIf: MID,
      },
      {
        key: "store_accounts", label: "Do you have developer accounts for the stores?", kind: "cards",
        options: ["Both", "One of them", "Neither", UNSURE],
        tip: "Apple and Google both require a paid developer account in YOUR name to publish. If you have neither, we will walk you through it. It is not a blocker.",
        showIf: [MID, onPhone],
      },
      {
        key: "store_accounts_wanted", label: "Would you like us to set up the ones you are missing?", kind: "yesno",
        showIf: [MID, onPhone, { key: "store_accounts", equals: ["One of them", "Neither", UNSURE] }],
        scope: "Apple and Google charge their own developer fees, paid to them and in your name. Our time to open the accounts and get the app through review is extra to the build, and quoted before we start.",
      },
    ],
  },
  {
    phase: "work", id: "apps_more", service: "apps", title: "A little more detail",
    blurb: "For a large app. All optional.",
    fields: [
      {
        key: "app_users_count", assist: true, kind: "cards",
        label: "How many people do you expect in the first year?",
        options: ["Under 100", "100 to 1,000", "1,000 to 10,000", "More than 10,000"],
        showIf: BIG,
      },
      {
        key: "app_data", assist: true, kind: "multi",
        label: "What personal information will the app hold?",
        options: ["Names and phones", "Payment details", "Photos", "Location", "Health information", "Other"],
        showIf: BIG,
      },
      {
        key: "backend", assist: true, kind: "cards", label: "Does the app already have a system behind it?",
        tip: "This is the system behind the app that stores information and handles requests. You do not need to know how it is built.",
        options: ["One exists", "Build it"],
        showIf: BIG,
      },
      {
        key: "app_know", kind: "yesno", label: "Do you already know which tools you want us to use?",
        hint: "Most people say no, and that is fine. We pick for you.",
        showIf: BIG,
      },
      {
        key: "app_tools", assist: true, kind: "multi", label: "Which tools do you want?",
        options: ["React Native", "Flutter and Dart", "Native iPhone and Android", "A web app that installs", "A database I already use", "Other"],
        showIf: [BIG, { key: "app_know", equals: ["Yes"] }],
      },
    ],
  },
];
