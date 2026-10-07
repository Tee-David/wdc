import type { Step } from "../onboarding-shared";

/**
 * The branding form's steps (Size first). One file per service so two people can
 * work on two services without touching the same lines. Composed by
 * `stepsFor` in ../onboarding.ts.
 */
export const BRANDING_STEPS: Step[] = [
  {
    phase: "work", id: "branding", service: "branding", title: "Branding & Design",
    blurb: "What we are making, and everywhere it has to survive.",
    fields: [
      {
        key: "brand_state", label: "What exists today?", kind: "cards", required: true,
        options: ["Nothing yet", "A logo only", "A full identity needing a refresh"],
      },
      {
        key: "deliverables", assist: true, label: "What are we making?", kind: "multi",
        tip: "A logo is your identifying symbol or name. A full identity system adds colours, typography and ways to use them together. Brand guidelines explain how to use that identity. Packaging covers product boxes or labels; signage covers signs; social templates are reusable post layouts; a pitch deck is a presentation.",
        options: ["Logo", "Full identity system", "Brand guidelines", "Packaging", "Signage", "Social templates", "Pitch deck", "Other"],
      },
      { key: "deliverables_other", label: "What else would you like us to create?", kind: "text", showIf: { key: "deliverables", equals: ["Other"] } },
      {
        key: "surfaces", assist: true, label: "Where will people see or use your logo?", kind: "multi",
        tip: "Choose the places you expect to use it. A logo stitched onto clothing needs to stay clear at a small size; a screen or large sign has different needs.",
        options: ["Embroidery", "Signage", "Print", "Screen", "Packaging", "Vehicle", "Stamp or seal", "Other"],
      },
      { key: "surfaces_other", label: "Where else must the brand work?", kind: "text", showIf: { key: "surfaces", equals: ["Other"] } },
      {
        key: "untouchable", assist: true, label: "Anything that must not change?", kind: "textarea",
        tip: "A name, a colour or a logo people already know you by.",
        /* Asked only when something exists to preserve. Putting this to a
           client who has just said "nothing yet" reads as a form that is not
           listening, and a form that is not listening is one people stop
           filling in. */
        showIf: { key: "brand_state", equals: ["A logo only", "A full identity needing a refresh"] },
      },
      { key: "avoid", assist: true, label: "Anything we should steer well clear of?", kind: "textarea" },
    ],
  },
];
