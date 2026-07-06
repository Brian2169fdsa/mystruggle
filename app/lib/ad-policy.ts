// Sponsored-placement content policy - HARD CONTENT SCREEN (safety stopgap).
//
// Member trust is the product. Nothing a person in recovery should not see is
// allowed to run in the community feed: no gambling, no alcohol, no predatory
// lending, no MLM, no obvious scams. This module is a pure function - no store
// access, safe to call from any route handler before a placement is created.
//
// FUTURE UPGRADE: the real gate (per docs/15 §B) is a Claude review with a
// recovery-safety rubric, run before any placement goes live. Until that
// exists, this deterministic keyword screen is the stopgap - case-insensitive,
// word-boundary matched - so the obviously-off-policy categories are hard-
// blocked in code and never reach ms_admin's review queue by accident.

/** Off-policy categories. Each entry: a human label + word-boundary patterns.
 *  Word boundaries (\b) keep this from tripping on innocent substrings - e.g.
 *  "betterment" does not match \bbet\b, "winery tour" is caught by \bwine\b but
 *  "winner" is not caught by \bwin\b (we never match \bwin\b). */
const BLOCKED: { label: string; patterns: RegExp[] }[] = [
  {
    label: "gambling",
    patterns: [
      /\bgambl(?:e|ing|er)?\b/i,
      /\bcasino\b/i,
      /\bbet(?:s|ting|tor)?\b/i,
      /\bwager(?:s|ing)?\b/i,
      /\bsportsbook\b/i,
      /\bslots?\b/i,
      /\blotter(?:y|ies)\b/i,
      /\bpoker\b/i,
    ],
  },
  {
    label: "alcohol",
    patterns: [
      /\balcohol(?:ic)?\b/i,
      /\bbeers?\b/i,
      /\bwines?\b/i,
      /\bliquor\b/i,
      /\bvodka\b/i,
      /\bwhiskey\b/i,
      /\bwhisky\b/i,
      /\btequila\b/i,
      /\bbrewery\b/i,
      /\bwinery\b/i,
      /\bcocktails?\b/i,
      /\bhappy hour\b/i,
      /\bbar crawl\b/i,
    ],
  },
  {
    label: "predatory lending",
    patterns: [
      /\bpayday loans?\b/i,
      /\bpayday\b/i,
      /\bcash advance\b/i,
      /\btitle loans?\b/i,
      /\bno credit check\b/i,
      /\bguaranteed approval\b/i,
      /\binstant cash\b/i,
    ],
  },
  {
    label: "MLM / pyramid",
    patterns: [
      /\bmlm\b/i,
      /\bmulti[- ]?level marketing\b/i,
      /\bbe your own boss\b/i,
      /\bpyramid scheme\b/i,
      /\bdownline\b/i,
      /\bwork from home and earn\b/i,
      /\bfinancial freedom opportunity\b/i,
    ],
  },
  {
    label: "scam",
    patterns: [
      /\bget rich quick\b/i,
      /\bmake \$?\d[\d,]* ?(?:a|per|\/) ?(?:day|week|month)\b/i,
      /\bguaranteed (?:income|returns?|profit|money)\b/i,
      /\bmiracle (?:cure|remedy)\b/i,
      /\brisk[- ]?free (?:money|investment|profit)\b/i,
      /\bcrypto (?:giveaway|doubler)\b/i,
    ],
  },
];

/**
 * Screen a placement's member-visible fields against the hard content policy.
 * Recovery-relevant content (services, alumni events, fair-chance jobs, IOP
 * programs, announcements) passes cleanly. Returns the first offending
 * category so the center sees an actionable reason.
 */
export function screenPlacement(
  title: string,
  body: string,
  ctaUrl: string
): { ok: boolean; reason?: string } {
  const haystack = `${title}\n${body}\n${ctaUrl}`;
  for (const { label, patterns } of BLOCKED) {
    if (patterns.some((re) => re.test(haystack))) {
      return {
        ok: false,
        reason: `Off-policy: content references ${label}, which cannot run in the recovery community feed.`,
      };
    }
  }
  return { ok: true };
}
