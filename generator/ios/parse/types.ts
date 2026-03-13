/**
 * TypeScript interfaces for all YAML/JSON structures in an OpenUISpec project.
 */

// ── Root manifest ────────────────────────────────────────────────────

export interface SpecManifest {
  spec_version: string;
  project: { name: string; description: string; icon: string };
  includes: {
    tokens: string;
    contracts: string;
    screens: string;
    flows: string;
    platform: string;
    locales: string;
  };
  i18n: {
    default_locale: string;
    supported_locales: string[];
    fallback_strategy: string;
  };
  generation: {
    targets: string[];
    output_format: Record<string, Record<string, unknown>>;
  };
  data_model: Record<string, Record<string, DataField>>;
  api: { base_url: string; auth: string; endpoints: Record<string, Record<string, unknown>> };
  formatters?: Record<string, unknown>;
  mappers?: Record<string, Record<string, string>>;
  custom_contracts?: string[];
}

export interface DataField {
  type: string;
  format?: string;
  required?: boolean;
  max_length?: number;
  values?: string[];
  default?: unknown;
}

// ── Tokens ───────────────────────────────────────────────────────────

export interface ColorTokens {
  color: Record<string, Record<string, ColorValue>>;
}

export interface ColorValue {
  semantic?: string;
  reference: string;
  range?: Record<string, number[]>;
  on_color?: { reference: string; contrast_min: number };
  opacity?: number;
}

export interface TypographyTokens {
  typography: {
    font_family: Record<string, FontFamily>;
    scale: Record<string, TypographyScale>;
  };
}

export interface FontFamily {
  semantic: string;
  value: string;
  fallback_strategy: string;
  platform: Record<string, { system_alternative?: string; load_strategy?: string; source?: string }>;
}

export interface TypographyScale {
  semantic: string;
  size: number | { base: number; range: number[] };
  weight: number;
  tracking?: number;
  line_height: number;
  transform?: string;
}

export interface SpacingTokens {
  spacing: {
    base_unit: number;
    platform_flex: number;
    scale: Record<string, number | { base: number; range: number[] }>;
    aliases: Record<string, unknown>;
  };
}

export interface ElevationTokens {
  elevation: Record<string, ElevationValue>;
}

export interface ElevationValue {
  semantic: string;
  value?: string;
  platform?: Record<string, { shadow?: ShadowValue; elevation?: number; box_shadow?: string }>;
}

export interface ShadowValue {
  color: string;
  opacity: number;
  radius: number;
  y: number;
}

export interface MotionTokens {
  motion: {
    duration: Record<string, number>;
    easing: Record<string, string>;
    reduced_motion: string;
    patterns: Record<string, unknown>;
  };
}

export interface ThemeTokens {
  themes: {
    default: string;
    variants: Record<string, Record<string, unknown>>;
    platform: Record<string, Record<string, boolean>>;
  };
}

export interface IconTokens {
  icons: {
    sizes: Record<string, { semantic: string; value: number }>;
    variants: { default: string; suffixes: Record<string, string> };
    fallback: { strategy: string; missing_icon: string };
    registry: Record<string, Record<string, IconEntry>>;
    custom?: Record<string, Record<string, IconEntry>>;
  };
}

export interface IconEntry {
  semantic: string;
  variants?: string[];
  platform: Record<string, string>;
}

export interface LayoutTokens {
  layout: {
    size_classes: Record<string, unknown>;
    platform_mapping: Record<string, unknown>;
    primitives: Record<string, unknown>;
    reflow_rules: Record<string, unknown>;
  };
}

// ── Platform ─────────────────────────────────────────────────────────

export interface PlatformConfig {
  ios: {
    framework: string;
    min_version: string;
    overrides: Record<string, unknown>;
    behaviors: Record<string, unknown>;
    generation: {
      imports: string[];
      architecture: string;
      naming: string;
    };
  };
}

// ── Screens ──────────────────────────────────────────────────────────

export interface ScreenSpec {
  [key: string]: ScreenDef;
}

export interface ScreenDef {
  semantic: string;
  status?: string;
  params?: Record<string, { type: string; required: boolean }>;
  data?: Record<string, DataSource>;
  state?: Record<string, StateField>;
  navigation?: ContractInstance;
  layout: LayoutDef;
  surfaces?: Record<string, SurfaceDef>;
}

export interface DataSource {
  source: string;
  params?: Record<string, string>;
}

export interface StateField {
  type: string;
  values?: string[];
  default: unknown;
}

export interface LayoutDef {
  type?: string;
  safe_area?: boolean;
  padding?: string;
  adaptive?: Record<string, unknown>;
  sections: SectionDef[];
}

export interface SectionDef {
  id: string;
  contract?: string;
  variant?: string;
  input_type?: string;
  props?: Record<string, unknown>;
  tokens_override?: Record<string, unknown>;
  adaptive?: Record<string, unknown>;
  action?: ActionDef;
  layout?: Record<string, unknown>;
  children?: (ContractInstance | SectionDef)[];
  padding?: string;
  padding_h?: string;
  margin_top?: string;
  position?: string;
  size?: string;
  condition?: string;
  interactive?: boolean;
  full_width?: boolean;
  form_id?: string;
  t_params?: Record<string, string>;
}

export interface ContractInstance {
  contract: string;
  variant?: string;
  input_type?: string;
  size?: string;
  props?: Record<string, unknown>;
  tokens_override?: Record<string, unknown>;
  adaptive?: Record<string, unknown>;
  action?: ActionDef;
  state_binding?: Record<string, string>;
  data_binding?: string;
  validate?: Record<string, unknown>;
  behavior?: Record<string, unknown>;
  interactive?: boolean;
  full_width?: boolean;
}

export interface ActionDef {
  type: string;
  [key: string]: unknown;
}

export interface SurfaceDef {
  contract: string;
  variant?: string;
  props?: Record<string, unknown>;
  adaptive?: Record<string, unknown>;
}

// ── Flows ────────────────────────────────────────────────────────────

export interface FlowSpec {
  [key: string]: FlowDef;
}

export interface FlowDef {
  semantic: string;
  status?: string;
  params?: Record<string, { type: string; required: boolean }>;
  entry: string;
  screens: Record<string, FlowScreen>;
  platform_hints?: Record<string, Record<string, unknown>>;
}

export interface FlowScreen {
  screen_inline: FlowScreenInline;
  transitions: Record<string, unknown>;
}

export interface FlowScreenInline {
  semantic: string;
  data?: Record<string, DataSource>;
  state?: Record<string, StateField>;
  layout: LayoutDef & { on_submit?: ActionDef };
}

// ── Locale ───────────────────────────────────────────────────────────

export type LocaleStrings = Record<string, string>;

// ── Aggregate ────────────────────────────────────────────────────────

export interface SpecProject {
  manifest: SpecManifest;
  tokens: {
    color: ColorTokens;
    typography: TypographyTokens;
    spacing: SpacingTokens;
    elevation: ElevationTokens;
    motion: MotionTokens;
    themes: ThemeTokens;
    icons: IconTokens;
    layout: LayoutTokens;
  };
  screens: Record<string, ScreenDef>;
  flows: Record<string, FlowDef>;
  platform: PlatformConfig;
  locales: Record<string, LocaleStrings>;
}
