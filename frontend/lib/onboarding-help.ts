/** Presentation only: keys and option values remain the existing brief contract. */
export const OPTION_HELP: Record<string, Record<string, string>> = {
  deliverables: {
    Logo: "The mark or wordmark people recognise.",
    "Full identity system": "Logo, type, colours and layouts working together.",
    "Brand guidelines": "A document explaining how to use the identity.",
    Packaging: "Design for boxes, bags, labels or wrappers.",
    Signage: "Signs for premises or events; making them is separate.",
    "Social templates": "Reusable layouts your team can fill with content.",
    "Pitch deck": "A presentation explaining an offer or business.",
  },
  surfaces: {
    Embroidery: "Stitching needs a clear mark at a small size.",
    "Stamp or seal": "A clear version that works in one colour.",
    Vehicle: "A mark that reads clearly on a larger moving surface.",
  },
  features: {
    Blog: "Publish articles and useful updates.",
    "Multi-language": "Content in more than one language.",
  },
  platforms: { iPhone: "For iPhone and iPad through Apple's store.", "Android phone": "For Android devices through Google's store." },
  backend: { "One exists": "An existing system can store and provide the app's data.", "Build it": "We need to plan that system alongside the app." },
  data_home: {
    Spreadsheets: "Information in tables, such as Excel or Sheets.",
    WhatsApp: "Information scattered across conversations.",
    Paper: "Forms, notebooks or files that need a digital workflow.",
    "An existing system": "Software already holds some of the information.",
    "Nowhere yet": "This will be a new workflow; no migration is implied.",
  },
  content_types: {
    "Short video": "A brief clip, such as a reel.", Photos: "Single images or a small set of photographs.",
    Carousels: "Several slides someone swipes through.", Stories: "Short updates shown in a story sequence.",
    Live: "A broadcast happening in real time.", "Written posts": "Words as the main part of the update.",
    "Memes and humour": "Lighthearted content that suits your audience.", "Behind the scenes": "Show how the work happens, with permission.",
  },
};

export const FIELD_EXAMPLES: Record<string, { title: string; steps: string[]; note: string; picture: "identity" | "search" | "website" | "app" | "workflow" | "social" }> = {
  deliverables: { title: "An identity, in practice", steps: ["Recognisable mark", "Consistent type and colour", "Rules for using them"], note: "A fictional example of the difference. Select only the outputs you need; your agreed scope decides what is included.", picture: "identity" },
  has_brandbook: { title: "What a brand guide contains", steps: ["Logo rules", "Colours and type", "Examples of use"], note: "A guide is a document, not an extra logo. It is fine not to have one.", picture: "identity" },
  target_terms: { title: "Think like a customer", steps: ["A product they need", "A problem to solve", "A service they search for"], note: "For example, a fictional bakery might be found for birthday cakes. These are starting ideas, not promised search rankings.", picture: "search" },
  page_count: { title: "What counts as a page?", steps: ["Home", "About", "Contact"], note: "These are three pages. Give an estimate, or ask us to recommend the structure.", picture: "website" },
  accounts: { title: "People and permissions", steps: ["Customer places order", "Staff manages order", "Owner manages access"], note: "An example, not a required account model. Tell us who needs to sign in and what each person may do.", picture: "app" },
  backend: { title: "The system behind an app", steps: ["Person uses app", "App sends a request", "System stores information"], note: "You do not need technical names. Describe what exists, or ask us to advise.", picture: "app" },
  process: { title: "Describe one real job", steps: ["Where it begins", "Who handles each step", "What a good result is"], note: "For AI, include who checks the output and what happens when it is wrong. Do not include private records or credentials in this brief.", picture: "workflow" },
  systems: { title: "What needs to work together?", steps: ["Current tools", "Information they exchange", "Who can approve access"], note: "Name the tools and the task. An answer does not grant access or commit us to an unreviewed integration.", picture: "workflow" },
  content_types: { title: "One message, different formats", steps: ["Photo: one moment", "Carousel: several slides", "Video: movement and sound"], note: "Examples help us understand your preferences; selecting a format does not promise a posting volume.", picture: "social" },
};
