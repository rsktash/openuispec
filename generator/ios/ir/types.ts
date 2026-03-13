/**
 * Intermediate representation types with resolved token values.
 */

export interface ResolvedColor {
  name: string;       // e.g. "brandPrimary"
  hex: string;        // e.g. "#5B4FE8"
  category: string;   // e.g. "brand"
}

export interface ResolvedTypography {
  name: string;       // e.g. "display"
  size: number;
  weight: number;
  tracking: number;
  lineHeight: number;
  transform?: string;
}

export interface ResolvedSpacing {
  name: string;
  value: number;
}

export interface ResolvedElevation {
  name: string;
  shadow?: { color: string; opacity: number; radius: number; y: number };
}

export interface ResolvedIcon {
  specName: string;
  sfSymbol: string;
}

export interface IR {
  projectName: string;
  colors: ResolvedColor[];
  typography: ResolvedTypography[];
  spacing: ResolvedSpacing[];
  elevations: ResolvedElevation[];
  icons: ResolvedIcon[];
  localeStrings: Record<string, string>;
  models: ModelDef[];
  screens: string[];   // screen keys
  flows: string[];     // flow keys
}

export interface ModelDef {
  name: string;
  fields: ModelField[];
}

export interface ModelField {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}
