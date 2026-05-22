/** Curated companies with full catalyst + cash runway coverage on company pages. */
export const FEATURED_COMPANY_SYMBOLS = ["IDEX.V", "PEX.V", "CURA", "ONDO.L"] as const;

export type FeaturedCompanySymbol = (typeof FEATURED_COMPANY_SYMBOLS)[number];
