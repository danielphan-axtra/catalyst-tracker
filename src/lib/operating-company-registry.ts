export type OperatingCompanyDefinition = {
  id: "curaleaf" | "ondo";
  symbols: string[];
  nameFragments: string[];
  operatingCashFlowFileName: string;
};

export const OPERATING_COMPANIES: OperatingCompanyDefinition[] = [
  {
    id: "curaleaf",
    symbols: ["CURA", "CURLF", "CURACN"],
    nameFragments: ["curaleaf"],
    operatingCashFlowFileName: "curaleaf-operating-cashflow.json",
  },
  {
    id: "ondo",
    symbols: ["ONDO", "ONDOL"],
    nameFragments: ["ondo insurtech", "ondo insur"],
    operatingCashFlowFileName: "ondo-operating-cashflow.json",
  },
];

function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/\./g, "");
}

export function matchOperatingCompany(
  symbol: string,
  name: string,
): OperatingCompanyDefinition | null {
  const s = normalizeSymbol(symbol);
  const n = name.toLowerCase();
  for (const entry of OPERATING_COMPANIES) {
    if (entry.symbols.includes(s)) return entry;
    if (entry.nameFragments.some((frag) => n.includes(frag))) return entry;
  }
  return null;
}

export function isCuraleafCompany(symbol: string, name: string): boolean {
  return matchOperatingCompany(symbol, name)?.id === "curaleaf";
}

export function isOndoInsurtechCompany(symbol: string, name: string): boolean {
  return matchOperatingCompany(symbol, name)?.id === "ondo";
}

export function isOperatingCompany(symbol: string, name: string): boolean {
  return matchOperatingCompany(symbol, name) != null;
}
