// Crisis-language screen - SAFETY STOPGAP.
//
// Per docs/05-MODULE-SOCIAL.md the real pipeline is a Claude review with a
// strict rubric; until that exists, this keyword pass makes sure obvious
// self-harm/danger language is HELD from the public feed (status "flagged"),
// resources are shown to the poster, and staff see it pinned in moderation.
// Pure function - no store access, safe to run on server or client.

/**
 * Case-insensitive, word-boundary patterns for self-harm / danger phrasing.
 * Deliberately conservative wording to avoid false positives on
 * recovery-positive talk (e.g. "suicide prevention", "suicide awareness").
 */
const CRISIS_PATTERNS: RegExp[] = [
  /\bwants? to die\b/i,
  /\bwanna die\b/i,
  /\bkill(?:ing)? myself\b/i,
  /\bend(?:ing)? it all\b/i,
  /\bend(?:ing)? my (?:own )?life\b/i,
  /\btak(?:e|ing) my own life\b/i,
  /\bsuicidal\b/i,
  // "suicide" alone is a signal - but not when it's support-seeking language
  // like "suicide prevention/awareness/hotline/lifeline/resources".
  /\bsuicide\b(?!\s+(?:prevention|awareness|hotline|lifeline|resources?))/i,
  /\bhurt(?:ing)? myself\b/i,
  /\bharm(?:ing)? myself\b/i,
  /\bno reason to live\b/i,
  /\bnothing (?:left )?to live for\b/i,
  /\boverdose on purpose\b/i,
  /\bbetter off (?:dead|without me)\b/i,
  /\bdon'?t want to (?:be here|be alive|live|wake up)\b/i,
];

/** True when `body` contains crisis language that must be held from the feed. */
export function isCrisisText(body: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(body));
}
