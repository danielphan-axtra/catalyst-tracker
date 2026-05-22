const SYMBOL_MARKET_OVERRIDES: Record<string, string> = {
  AEM: "NYS",
  AGI: "NYS",
  AU: "NYS",
  ABX: "NYS",
  CNQ: "NYS",
  CS: "TSX",
  EDV: "LSE",
  EXM: "TSV",
  FPX: "TSV",
  FM: "TSX",
  GILD: "CBO",
  GFI: "NYS",
  HBM: "NYS",
  IMG: "TSX",
  IVN: "TSX",
  K: "TSX",
  LUG: "TSX",
  LUN: "TSX",
  NCU: "TSX",
  NGD: "NYS",
  ONDO: "LSE",
  PAAS: "NAS",
  PRU: "ASX",
  RSG: "LSE",
  ROG: "TSX",
  PHYS: "TSX",
  PSLV: "TSX",
  "TECK-A": "TSX",
  "TECK-B": "TSX",
  WPM: "NYS",
  WCP: "TSX",
};

const COMPANY_MARKET_OVERRIDES: Record<string, string[]> = {
  "agnico eagle mines": ["NYS", "TSX"],
  "alamos gold": ["NYS", "TSX"],
  "anglogold ashanti": ["NYS", "JSE"],
  "b2gold": ["NYS", "TSX"],
  "barrick gold": ["NYS", "TSX"],
  "borealis mining": ["TSV"],
  "canadian natural resources": ["NYS", "TSX"],
  "capstone copper": ["TSX"],
  "endeavour mining": ["LSE", "TSX"],
  "excellon resources": ["TSX"],
  "fpx nickel": ["TSV"],
  "first quantum minerals": ["TSX"],
  "gilead sciences cdr (cad hedged)": ["CBO"],
  "gold fields": ["NYS", "JSE"],
  "hudbay minerals": ["NYS", "TSX"],
  iamgold: ["NYS", "TSX"],
  "idex metals": ["TSV"],
  "ivanhoe mines": ["TSX"],
  "kinross gold": ["NYS", "TSX"],
  "lundin gold": ["TSX"],
  "lundin mining": ["TSX", "STO"],
  "nevada copper": ["TSX"],
  "new gold": ["NYS", "TSX"],
  "ondo insurtech": ["LSE"],
  curaleaf: ["CSE", "NYS"],
  "pan american silver": ["NAS", "TSX"],
  "perseus mining": ["ASX"],
  "resolute mining": ["ASX"],
  roxgold: ["TSX"],
  "sovereign metals": ["ASX"],
  "sprott physical gold trust": ["NYS", "TSX"],
  "sprott physical silver": ["NYS", "TSX"],
  "teck resources": ["NYS", "TSX"],
  "wheaton precious metals": ["NYS", "TSX"],
  "whitecap resources": ["TSX"],
};

export function normalizeCompanyNameForListings(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|inc\.|corp|corp\.|corporation|limited|ltd|ltd\.|plc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getMarketFromSymbol(symbol: string): string | null {
  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed) return null;

  if (trimmed.endsWith(".TO")) return "TSX";
  if (trimmed.endsWith(".V")) return "TSV";
  if (trimmed.endsWith(".AX")) return "ASX";
  if (trimmed.endsWith(".L")) return "LSE";

  return SYMBOL_MARKET_OVERRIDES[trimmed] ?? null;
}

export function getCompanyMarkets(symbols: string[]): string[] {
  const markets = symbols.map(getMarketFromSymbol).filter((m): m is string => Boolean(m));
  return Array.from(new Set(markets)).sort();
}

export function getCompanyMarketsForName(name: string, symbols: string[]): string[] {
  const normalized = normalizeCompanyNameForListings(name);
  const bySymbol = getCompanyMarkets(symbols);
  const byName = COMPANY_MARKET_OVERRIDES[normalized] ?? [];
  return Array.from(new Set([...byName, ...bySymbol])).sort();
}
