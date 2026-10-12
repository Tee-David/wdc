/** What a page hands the calendar. Plain data only: a server page cannot pass functions to it. */
export type CalCalendar = {
  id: string;
  label: string;
  /** A CSS colour, normally one of the --cal-1 to --cal-7 tokens in calendar.css. */
  color: string;
};

export type CalPerson = { initials: string; tone?: string };

export type CalEvent = {
  id: string;
  /** Studio date, "2026-10-12". */
  date: string;
  /** Studio clock time, "13:30". Leave out for an all day item. */
  start?: string;
  end?: string;
  title: string;
  sub?: string;
  /** The id of the calendar it belongs to. */
  cal: string;
  /** Where pressing it goes. */
  href?: string;
  people?: CalPerson[];
  tag?: { text: string; tone: "good" | "warn" | "bad" | "flat" | "brand" | "live" };
  /** A solid tile before the title (a platform mark): its colour and a short text. */
  mark?: { text: string; bg: string };
  /** For the calendar file: shown to the person who opens it. */
  note?: string;
};

export type CalAdd = {
  label: string;
  /** The link a press goes to. {date} and {time} are replaced with the studio date and clock time. */
  href: string;
};
