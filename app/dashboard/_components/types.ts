export type Section =
  | "overview"
  | "participants"
  | "detail"
  | "giving"
  | "moderation"
  | "reports";

export type GivingStep = "amount" | "pin" | "done";

export type Verdict = "pending" | "approved" | "flagged" | "removed";

export type ModStatus = {
  jasmine: Verdict;
  kevin: Verdict;
};

/** White card shell used across every dashboard section. */
export const CARD = "rounded-2xl bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)]";
