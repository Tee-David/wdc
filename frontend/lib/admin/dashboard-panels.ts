/** The panels a person may hide, by their `data-tour` hook. Anything else posted is ignored. */
export const HIDEABLE = [
  ["dash-forecast", "Next 30 days"], ["dash-cashflow", "Cashflow"], ["dash-pipeline", "Project pipeline"],
  ["dash-deadlines", "Upcoming deadlines"], ["dash-payments", "Recent payments"], ["dash-quick-actions", "Quick actions"],
  ["dash-today", "Today"], ["dash-mywork", "My work"],
] as const;

