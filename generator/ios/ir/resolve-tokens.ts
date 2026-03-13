/**
 * Resolve token paths to concrete values.
 */

import type { SpecProject } from "../parse/types.js";
import type { ResolvedColor, ResolvedTypography, ResolvedSpacing, ResolvedElevation } from "./types.js";

export function resolveColors(project: SpecProject): ResolvedColor[] {
  const colors: ResolvedColor[] = [];
  const colorData = project.tokens.color.color;

  for (const [category, entries] of Object.entries(colorData)) {
    for (const [name, value] of Object.entries(entries)) {
      const ref = typeof value === "object" && value !== null && "reference" in value
        ? (value as { reference: string }).reference
        : typeof value === "string" ? value : "#000000";
      colors.push({
        name: `${category}_${name}`,
        hex: ref,
        category,
      });
    }
  }

  return colors;
}

export function resolveTypography(project: SpecProject): ResolvedTypography[] {
  const result: ResolvedTypography[] = [];
  const scale = project.tokens.typography.typography.scale;

  for (const [name, entry] of Object.entries(scale)) {
    const size = typeof entry.size === "object" ? entry.size.base : entry.size;
    result.push({
      name,
      size,
      weight: entry.weight,
      tracking: entry.tracking ?? 0,
      lineHeight: entry.line_height,
      transform: entry.transform,
    });
  }

  return result;
}

export function resolveSpacing(project: SpecProject): ResolvedSpacing[] {
  const result: ResolvedSpacing[] = [];
  const scale = project.tokens.spacing.spacing.scale;

  for (const [name, value] of Object.entries(scale)) {
    const resolved = typeof value === "object" && value !== null && "base" in value
      ? (value as { base: number }).base
      : value as number;
    result.push({ name, value: resolved });
  }

  return result;
}

export function resolveElevations(project: SpecProject): ResolvedElevation[] {
  const result: ResolvedElevation[] = [];
  const elev = project.tokens.elevation.elevation;

  for (const [name, entry] of Object.entries(elev)) {
    const ios = entry.platform?.ios;
    result.push({
      name,
      shadow: ios?.shadow as ResolvedElevation["shadow"],
    });
  }

  return result;
}
