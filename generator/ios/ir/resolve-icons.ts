/**
 * Resolve icon names to SF Symbol names via icons.yaml registry.
 */

import type { SpecProject } from "../parse/types.js";
import type { ResolvedIcon } from "./types.js";

export function resolveIcons(project: SpecProject): ResolvedIcon[] {
  const icons: ResolvedIcon[] = [];
  const registry = project.tokens.icons.icons.registry;
  const custom = project.tokens.icons.icons.custom;

  // Standard registry
  for (const [_category, entries] of Object.entries(registry)) {
    for (const [name, entry] of Object.entries(entries)) {
      icons.push({
        specName: name,
        sfSymbol: entry.platform.ios,
      });
      // Also add variant suffixes
      if (entry.variants) {
        for (const variant of entry.variants) {
          icons.push({
            specName: `${name}_${variant}`,
            sfSymbol: `${entry.platform.ios}.${variant}`,
          });
        }
      }
    }
  }

  // Custom icons
  if (custom) {
    for (const [_group, entries] of Object.entries(custom)) {
      for (const [name, entry] of Object.entries(entries)) {
        icons.push({
          specName: name,
          sfSymbol: entry.platform.ios,
        });
      }
    }
  }

  return icons;
}

/** Look up a single icon's SF Symbol name. Falls back to the spec name with dots. */
export function lookupSfSymbol(specName: string, icons: ResolvedIcon[]): string {
  const found = icons.find((i) => i.specName === specName);
  if (found) return found.sfSymbol;
  // Fallback: convert underscores to dots (common SF Symbol pattern)
  return specName.replace(/_/g, ".");
}
