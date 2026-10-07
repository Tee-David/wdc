import { UNSURE, type Cond, type Step } from "../onboarding-shared";

/**
 * The Software & AI form, Size first, after the UX research
 * (plans/onboarding-ux-research.md, E5).
 *
 * This service had the heaviest typing of the six, so every big open question
 * now starts as a tap: pain chips above the free text, tool chips above the
 * write-in, rule chips for the AI data terms. "Walk us through how the work is
 * done today" was cut. It is a call topic, or a WhatsApp voice note.
 */

export const SIZE_KEY = "sw_size";

const AI = "An AI assistant or chatbot";
const AUTOMATION = "An automation";
const PIPELINE = "A data pipeline";
const TOOL = "An internal tool";
const CONNECT = "Connecting the systems I use";
const OTHER_KIND = "Something else";

const MID: Cond = { tier: 2 };
const BIG: Cond = { tier: 3 };
/* The AI data terms are collected wherever data may move through a model. */
const dataRules: Cond = { key: "sw_kind", equals: [AI, AUTOMATION, PIPELINE] };

export const SOFTWARE_STEPS: Step[] = [
  {
    phase: "work", id: "software", service: "software", title: "The problem",
    blurb: "Start with what slows you down.",
    fields: [
      {
        key: "n_scope", kind: "notice", label: "What we take on",
        hint: "Internal tools, automations, AI assistants and connecting the systems you use. Very heavy software is out of scope, and we will say so plainly if your idea is.",
      },
      {
        key: SIZE_KEY, assist: true, required: true, kind: "cards",
        label: "How big is the job?",
        hint: "A rough feel is enough. We confirm it later.",
        options: ["Small", "Medium", "Large"],
        optionInfo: {
          Small: { desc: "One task to automate, or one small tool." },
          Medium: { desc: "A tool or assistant with a few connections." },
          Large: { desc: "Several connected parts, with data and many users." },
        },
      },
      {
        key: "sw_pains", assist: true, required: true, kind: "multi",
        label: "What slows your team down most?",
        hint: "Tap what sounds like you. Or tell us the idea in your own words below.",
        options: [
          "Copying data between tools", "Answering the same questions", "Slow approvals",
          "Reports done by hand", "Tracking orders or stock", "Something else",
        ],
      },
      {
        key: "process", assist: true, kind: "textarea",
        label: "Tell us more, if you like",
        placeholder: "Optional. A few lines is plenty. You can also send a voice note on WhatsApp.",
      },
      { key: "sw_files", kind: "upload", label: "Show us what you have", hint: "Documents, screenshots or spreadsheets. Optional." },
    ],
  },
  {
    phase: "work", id: "software_kind", service: "software", title: "What kind of help",
    blurb: "And what it has to connect to.",
    fields: [
      {
        key: "sw_kind", assist: true, required: true, kind: "cards",
        label: "What kind of help do you want?",
        options: [TOOL, AUTOMATION, AI, CONNECT, PIPELINE, OTHER_KIND],
        optionInfo: {
          [TOOL]: { desc: "A dashboard or app for your team." },
          [AUTOMATION]: { desc: "Repeat work done for you." },
          [AI]: { desc: "Answers questions or does tasks for you or your customers." },
          [CONNECT]: { desc: "Your tools talking to each other." },
          [PIPELINE]: { desc: "Data collected, cleaned and put to use." },
          [OTHER_KIND]: { desc: "Tell us on the call." },
        },
      },
      {
        key: "sw_tools", assist: true, kind: "multi",
        label: "Which tools must it connect to?",
        hint: "We can connect to any tool that has an API.",
        options: ["WhatsApp", "Google Sheets or Excel", "Accounting software", "A payment provider", "A database", "Email", "Other", "Not sure"],
        showIf: MID,
      },
      { key: "systems", label: "Any other tools or systems?", kind: "text", placeholder: "Name them", showIf: [MID, { key: "sw_tools", equals: ["Other"] }] },
      {
        key: "n_demo", kind: "notice", label: "Seeing past work",
        hint: "We show demos of past work on the discovery call.",
      },
    ],
  },
  {
    phase: "work", id: "software_data", service: "software", title: "Data and people",
    blurb: "Who uses it, and the rules for your data.",
    fields: [
      {
        key: "sw_ai_rules", assist: true, kind: "multi",
        label: "Do you have rules about your data?",
        hint: "Where it may go and who may see it.",
        options: ["Data must stay in Nigeria", "Only some staff may see it", "No special rules", UNSURE],
        showIf: [MID, dataRules],
      },
      { key: "compliance", assist: true, label: "Anything else about data rules?", kind: "textarea", showIf: [MID, dataRules] },
      {
        key: "sw_ai_review", assist: true, kind: "cards", label: "Should a person check what the AI says?",
        options: ["Every answer", "Spot checks", "Not needed"],
        showIf: [MID, { key: "sw_kind", equals: [AI] }],
      },
      { key: "users_count", assist: true, label: "How many people will use it, and who are they?", kind: "text", showIf: MID },
      {
        key: "data_home", assist: true, kind: "cards", label: "Where does that information live now?",
        options: ["Spreadsheets", "WhatsApp", "Paper", "An existing system", "Nowhere yet", "Other"],
        showIf: MID,
      },
      {
        key: "sw_success", assist: true, kind: "multi", label: "How will you know it worked?",
        options: ["Save time", "Fewer mistakes", "More sales", "Better reports", "Other"],
        showIf: MID,
      },
      { key: "success_metric", label: "A number that would show it", kind: "text", placeholder: "For example hours saved a week", showIf: BIG },
    ],
  },
];
