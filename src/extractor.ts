// src/extractor.ts
import type { Locator, Page } from "playwright";
import type { CssSelector, SelectorDef } from "./types.js";

/**
 * Normalize a selector (string | string[]) into a list of strings.
 */
export function normalizeSelector(s: CssSelector): string[] {
  return Array.isArray(s) ? s : [s];
}

/**
 * Try each fallback selector; return the first matching Locator.
 * Root can be Page or Locator (for nested queries).
 */
export async function resolveLocator(
  root: Page | Locator,
  selector: CssSelector
): Promise<Locator> {
  const candidates = normalizeSelector(selector);
  for (const s of candidates) {
    const loc = "locator" in root ? root.locator(s) : (root as Page).locator(s);
    if (await loc.count()) return loc;
  }
  // if none match, return first to surface better error messages on usage
  const firstCandidate = candidates[0]!;
  return "locator" in root
    ? root.locator(firstCandidate)
    : (root as Page).locator(firstCandidate);
}

async function getAttr(l: Locator, attr?: string): Promise<string | null> {
  const a = attr ?? "textContent";
  if (a === "textContent") {
    const t = await l.first().textContent();
    return t?.trim() ?? null;
  }
  return await l.first().getAttribute(a);
}

/**
 * Extract data according to SelectorDef.
 * - If def.all: returns an array
 * - If def.fields: returns an object (map of field -> value)
 * - Else: returns a string|null attribute value
 *
 * root can be a Page or Locator for scoping.
 */
export async function extractFrom(
  root: Page | Locator,
  def: SelectorDef
): Promise<any> {
  const loc = await resolveLocator(root, def.selector);

  // all = multiple
  // if (def.all) {
  const count = await loc.count();
  const out: any[] = [];
  for (let i = 0; i < count; i++) {
    const item = loc.nth(i);
    if (def.fields) {
      const record: Record<string, any> = {};
      for (const [key, sub] of Object.entries(def.fields)) {
        record[key] = await extractFrom(item, sub);
      }
      out.push(record);
    } else {
      out.push(await getAttr(item, def.attr));
    }
  }
  return out;
  // }

  // single
  // if (def.fields) {
  //   const record: Record<string, any> = {};
  //   for (const [key, sub] of Object.entries(def.fields)) {
  //     record[key] = await extractFrom(loc, sub);
  //   }
  //   return record;
  // }

  // return await getAttr(loc, def.attr);
}
