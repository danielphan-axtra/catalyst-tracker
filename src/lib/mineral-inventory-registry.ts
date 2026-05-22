import fs from "fs";
import path from "path";
import type { MineralInventoryFile } from "@/lib/mineral-inventory-types";

let cache: MineralInventoryFile[] | null = null;

export function clearMineralInventoryCache(): void {
  cache = null;
}

function loadAllInventories(): MineralInventoryFile[] {
  if (cache) return cache;
  const dir = path.join(process.cwd(), "data", "mineral-inventory");
  if (!fs.existsSync(dir)) {
    cache = [];
    return cache;
  }
  cache = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      return JSON.parse(raw) as MineralInventoryFile;
    });
  return cache;
}

function matchesInventory(inv: MineralInventoryFile, symbol: string, name: string): boolean {
  const sBase = symbol.toUpperCase().replace(/\.(TO|V|AX|L)$/i, "");
  const sFull = symbol.toUpperCase();
  const n = name.toLowerCase();

  if (inv.symbols?.some((sym) => sym.toUpperCase() === sFull || sym.toUpperCase().replace(/\.(TO|V|AX|L)$/i, "") === sBase)) {
    return true;
  }
  if (inv.matchNames?.some((frag) => n.includes(frag.toLowerCase()))) return true;

  const legacy: Record<string, string[]> = {
    iamgold: ["IAG", "IMG"],
    "agnico-eagle": ["AEM"],
    "pacific-ridge": ["PEX"],
  };
  const keys = legacy[inv.companyKey];
  if (keys?.includes(sBase)) return true;

  return false;
}

export function getMineralInventory(symbol: string, name: string): MineralInventoryFile | null {
  for (const inv of loadAllInventories()) {
    if (matchesInventory(inv, symbol, name)) return inv;
  }
  return null;
}
