/**
 * THE STAFF KNOWLEDGE BASE: how the tools and client work go, written for the
 * team (the S-Support board). Short, kept in code because it changes with the
 * product; the client articles stay in Settings, Help centre.
 */
export type StaffArticle = { id: string; t: string; s: string; cat: string; mins: string; steps: { t: string; s: string }[] };

export const STAFF_HELP: StaffArticle[] = [
 {
  "id": "sa1",
  "t": "Send posts for approval",
  "s": "One batch, one link, answered in about two hours.",
  "cat": "Posts and approvals",
  "mins": "2 min read",
  "steps": [
   {
    "t": "Finish captions and art for each post",
    "s": "Every post needs a platform, a time and a caption."
   },
   {
    "t": "Open the content calendar and tick the posts to send",
    "s": "You can send one post or the whole week."
   },
   {
    "t": "Review the email the client will get",
    "s": "It shows every post exactly as it will look."
   },
   {
    "t": "Send, then wait for the countdown",
    "s": "There are eight seconds to undo. Approvals come back to your project page."
   }
  ]
 },
 {
  "id": "sa2",
  "t": "What the client sees",
  "s": "The portal, the email and the approval link, side by side.",
  "cat": "Posts and approvals",
  "mins": "2 min read",
  "steps": [
   {
    "t": "A post preview",
    "s": "Looks like the platform, with the caption and the time."
   },
   {
    "t": "Comments and changes",
    "s": "Anything they write reaches you at once."
   },
   {
    "t": "Approve in two taps",
    "s": "The approval link works without signing in."
   }
  ]
 },
 {
  "id": "sa3",
  "t": "Use the content calendar",
  "s": "Week and month views, filters and planning a post.",
  "cat": "Posts and approvals",
  "mins": "3 min read",
  "steps": [
   {
    "t": "Switch between week and month",
    "s": "The month view shows a dot for each post."
   },
   {
    "t": "Filter by platform",
    "s": "Instagram, Facebook and TikTok each have their mark."
   },
   {
    "t": "Plan a post",
    "s": "Pick the day and time. The best times are suggested from the last 30 days."
   }
  ]
 },
 {
  "id": "sa4",
  "t": "Hand a task over",
  "s": "Pass it on with your notes so nothing is lost.",
  "cat": "Tasks",
  "mins": "1 min read",
  "steps": [
   {
    "t": "Open the task or the deck card",
    "s": "Choose Hand over."
   },
   {
    "t": "Pick the person",
    "s": "The best fit for the department is marked."
   },
   {
    "t": "Add a note",
    "s": "It goes with the task. They get a notice straight away."
   }
  ]
 },
 {
  "id": "sa5",
  "t": "Where files and handovers live",
  "s": "Project files, the handover document and the recorded meeting.",
  "cat": "Tasks",
  "mins": "2 min read",
  "steps": [
   {
    "t": "Open the project, then Files",
    "s": "Everything shared with the client sits here."
   },
   {
    "t": "Handover pieces",
    "s": "A recorded Google Meet, then the handover document."
   },
   {
    "t": "Anything for Admin to see",
    "s": "Mark it Team only so the client never sees it."
   }
  ]
 },
 {
  "id": "sa6",
  "t": "Ask Admin first",
  "s": "What to check with Admin before you promise anything.",
  "cat": "Working with Admin",
  "mins": "1 min read",
  "steps": [
   {
    "t": "Anything about money",
    "s": "Prices, discounts, refunds and payment dates are Admin’s call."
   },
   {
    "t": "Anything that changes the scope",
    "s": "A new platform, extra rounds or a longer plan."
   },
   {
    "t": "Anything the client is unhappy about",
    "s": "Tell Admin the same day, with the message attached."
   }
  ]
 },
 {
  "id": "sa7",
  "t": "Help a client share Instagram access",
  "s": "The two minute guide and what to do if it fails.",
  "cat": "Clients",
  "mins": "2 min read",
  "steps": [
   {
    "t": "Send the guide",
    "s": "Attach it to the first message, not a reminder."
   },
   {
    "t": "Offer a five minute call",
    "s": "Most clients get through while someone watches."
   },
   {
    "t": "Still stuck after a week",
    "s": "Raise a ticket so Admin can step in."
   }
  ]
 },
 {
  "id": "sa8",
  "t": "When a client does not reply",
  "s": "A kind rhythm that gets answers without nagging.",
  "cat": "Clients",
  "mins": "2 min read",
  "steps": [
   {
    "t": "After two days",
    "s": "A short reminder with a one tap link."
   },
   {
    "t": "After a week",
    "s": "Ask Admin to call. Calls get answers when emails do not."
   },
   {
    "t": "Keep a note",
    "s": "Write it on the project so the next person knows."
   }
  ]
 }
];
