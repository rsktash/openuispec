/**
 * Resolve $t: references to localization key names.
 */

import type { LocaleStrings } from "../parse/types.js";

/**
 * Returns all locale strings for the default locale, stripping metadata keys.
 */
export function resolveLocaleStrings(locales: Record<string, LocaleStrings>): Record<string, string> {
  const en = locales["en"] ?? Object.values(locales)[0] ?? {};
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(en)) {
    if (!key.startsWith("$")) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Convert a $t:key reference to a Swift localization call.
 * e.g. "$t:home.greeting.morning" → "L10n.homeGreetingMorning"
 */
export function l10nSwiftKey(tRef: string): string {
  const key = tRef.startsWith("$t:") ? tRef.slice(3) : tRef;
  return `L10n.${dotToCamel(key)}`;
}

function dotToCamel(dotted: string): string {
  return dotted
    .split(".")
    .map((part, i) => {
      const camel = part.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      return i === 0 ? camel : camel.charAt(0).toUpperCase() + camel.slice(1);
    })
    .join("");
}
