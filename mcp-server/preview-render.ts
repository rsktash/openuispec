/**
 * preview-render.ts — Renders OpenUISpec screen specs as HTML+CSS.
 *
 * Resolves tokens, locale strings, bindings, and maps contracts to
 * semantic HTML elements for visual preview.
 */

// ── types ───────────────────────────────────────────────────────────

export interface PreviewContext {
  manifest: any;                         // includes _contractDefs for project contract extensions
  screen: any;
  screenName: string;
  tokens: Record<string, any>;         // category → parsed YAML
  locale: Record<string, string>;       // flat key → value
  mockData: Record<string, any>;        // data.key → value
  mockParams: Record<string, any>;      // params.key → value
  sizeClass: "compact" | "regular" | "expanded";
  theme: "light" | "dark";
}

// ── token resolution ────────────────────────────────────────────────

function resolveTokenPath(tokens: Record<string, any>, path: string): string | undefined {
  // e.g. "color.brand.primary" → tokens.color.color.brand.primary.reference
  // or "typography.heading_lg" → font props
  // or "spacing.md" → pixel value

  const parts = path.split(".");
  const category = parts[0];
  const tokenData = tokens[category];
  if (!tokenData) return undefined;

  if (category === "color") {
    // Navigate: color.<rest>.reference
    let node = tokenData.color;
    for (let i = 1; i < parts.length; i++) {
      if (!node || typeof node !== "object") return undefined;
      node = node[parts[i]];
    }
    if (typeof node === "string") return node;
    if (node?.reference) return node.reference;
    return undefined;
  }

  if (category === "typography") {
    // typography.heading_lg → look in scale
    const scaleName = parts[1];
    const scale = tokenData.typography?.scale?.[scaleName];
    if (!scale) return undefined;
    // Return as CSS shorthand for use in tokens_override
    return scaleName; // Handled specially in renderTypographyStyle
  }

  if (category === "spacing") {
    const scaleName = parts[1];
    // Check aliases first
    const alias = tokenData.spacing?.aliases?.[scaleName];
    if (alias !== undefined) {
      if (typeof alias === "object" && !Array.isArray(alias)) {
        // e.g. page_margin: { horizontal: md, vertical: md }
        const h = resolveSpacingValue(tokenData, alias.horizontal ?? alias.all);
        const v = resolveSpacingValue(tokenData, alias.vertical ?? alias.all);
        return `${v}px ${h}px`;
      }
      return `${resolveSpacingValue(tokenData, alias)}px`;
    }
    const val = tokenData.spacing?.scale?.[scaleName];
    if (val !== undefined) {
      return `${resolveSpacingValue(tokenData, scaleName)}px`;
    }
    return undefined;
  }

  if (category === "elevation") {
    // Resolve to CSS box-shadow from the web platform value
    const level = parts[1]; // sm, md, lg
    const elevData = tokenData.elevation?.[level];
    if (!elevData) return level === "none" ? "none" : undefined;
    const webShadow = elevData.platform?.web?.box_shadow;
    if (webShadow) return webShadow;
    // Fallback from iOS shadow definition
    const iosShadow = elevData.platform?.ios?.shadow;
    if (iosShadow) {
      return `0 ${iosShadow.y ?? 2}px ${iosShadow.radius ?? 8}px rgba(0,0,0,${iosShadow.opacity ?? 0.08})`;
    }
    return undefined;
  }

  return undefined;
}

// ── theme-aware color resolution ────────────────────────────────────

function hexToHSL(hex: string): { h: number; s: number; l: number; a: number } {
  hex = hex.replace("#", "");
  let a = 1;
  if (hex.length === 8) { a = parseInt(hex.slice(6, 8), 16) / 255; hex = hex.slice(0, 6); }
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100, a };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100, a };
}

function hslToHex(h: number, s: number, l: number, a = 1): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  const hex = `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  if (a < 1) return hex + toHex(a);
  return hex;
}

function applyThemeTransform(baseHex: string, rule: any): string {
  const hsl = hexToHSL(baseHex);
  if (rule.lightness) {
    const [lo, hi] = rule.lightness;
    hsl.l = (lo + hi) / 2;
  }
  if (rule.saturation) {
    const [lo, hi] = rule.saturation;
    hsl.s = (lo + hi) / 2;
  }
  if (rule.hue !== undefined) {
    hsl.h = typeof rule.hue === "number" ? rule.hue : (rule.hue[0] + rule.hue[1]) / 2;
  }
  if (rule.opacity !== undefined) {
    hsl.a = rule.opacity;
  }
  return hslToHex(hsl.h, hsl.s, hsl.l, hsl.a);
}

/**
 * Resolve a color token path with theme awareness.
 * If ctx.theme != "light", applies transforms from themes.yaml.
 */
function resolveColor(ctx: PreviewContext, path: string): string | undefined {
  const baseColor = resolveTokenPath(ctx.tokens, path);
  if (!baseColor || ctx.theme === "light") return baseColor;

  // Look up theme transform rules
  const themeVariants = ctx.tokens.themes?.themes?.variants?.[ctx.theme];
  if (!themeVariants) return baseColor;

  // The path is like "color.surface.primary" → theme key is "surface.primary"
  const parts = path.split(".");
  if (parts[0] !== "color" || parts.length < 3) return baseColor;
  const themeKey = parts.slice(1).join(".");

  const rule = themeVariants[themeKey];
  if (!rule) return baseColor;

  return applyThemeTransform(baseColor, rule);
}

function resolveSpacingValue(spacingData: any, key: string | number): number {
  if (typeof key === "number") return key;
  const val = spacingData.spacing?.scale?.[key];
  if (val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "object" && val.base !== undefined) return val.base;
  return 0;
}

/** Resolve spacing token with px fallback. */
function sp(ctx: PreviewContext, scaleName: string, fallbackPx: number): string {
  return resolveTokenPath(ctx.tokens, `spacing.${scaleName}`) ?? `${fallbackPx}px`;
}

/** Apply alpha to a hex color via rgba(). Replaces the broken `${hex}15` pattern. */
function colorWithAlpha(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  if (c.length >= 6) {
    return `rgba(${parseInt(c.slice(0,2),16)}, ${parseInt(c.slice(2,4),16)}, ${parseInt(c.slice(4,6),16)}, ${alpha})`;
  }
  return hex;
}

function getTypographyCSS(tokens: Record<string, any>, scaleName: string): string {
  const typo = tokens.typography?.typography;
  const scale = typo?.scale?.[scaleName];
  if (!scale) return "";

  const fontFamily = typo?.font_family?.primary?.value ?? "system-ui";
  const size = typeof scale.size === "object" ? scale.size.base : scale.size;
  const weight = scale.weight ?? 400;
  const lineHeight = scale.line_height ?? 1.5;
  const tracking = scale.tracking ?? 0;
  const transform = scale.transform ?? "none";

  let css = `font-family: '${fontFamily}', system-ui, sans-serif; `;
  css += `font-size: ${size}px; `;
  css += `font-weight: ${weight}; `;
  css += `line-height: ${lineHeight}; `;
  if (tracking !== 0) css += `letter-spacing: ${tracking}em; `;
  if (transform !== "none") css += `text-transform: ${transform}; `;
  return css;
}

// ── locale resolution ───────────────────────────────────────────────

function resolveLocale(
  locale: Record<string, string>,
  key: string,
  tParams?: Record<string, any>,
  ctx?: PreviewContext,
): string {
  // key is like "$t:settings.theme" → strip "$t:"
  let localeKey = key.startsWith("$t:") ? key.slice(3) : key;

  // Resolve any binding expressions within the locale key itself
  // e.g. "home.greeting.{time_of_day | format:greeting}" → "home.greeting.morning"
  if (ctx && localeKey.includes("{")) {
    localeKey = localeKey.replace(/\{([^}]+)\}/g, (_, inner) => resolveBindingExpr(inner.trim(), ctx));
  }

  let value = locale[localeKey];
  if (value === undefined) return `[${localeKey}]`;

  // Handle ICU plural: "{count, plural, =0 {No tasks} one {# task} other {# tasks}}"
  if (value.includes("{") && value.includes("plural")) {
    value = simplifyPlural(value, tParams, ctx);
  }

  // Interpolate {param} references
  if (tParams && ctx) {
    for (const [paramKey, paramValue] of Object.entries(tParams)) {
      const resolved = typeof paramValue === "string"
        ? resolveBinding(paramValue, ctx)
        : String(paramValue);
      value = value.replace(new RegExp(`\\{${paramKey}\\}`, "g"), resolved);
    }
  }

  return value;
}

function simplifyPlural(template: string, tParams?: Record<string, any>, ctx?: PreviewContext): string {
  // Extract: "{count, plural, =0 {No tasks} one {# task} other {# tasks left out of {total}}}"
  const match = template.match(/\{(\w+),\s*plural,\s*(.+)\}/s);
  if (!match) return template;

  const paramName = match[1];
  const forms = match[2];

  // Get the count value
  let count = 3; // default for preview
  if (tParams && ctx) {
    const raw = tParams[paramName];
    if (raw !== undefined) {
      const resolved = typeof raw === "string" ? resolveBinding(raw, ctx) : raw;
      const parsed = Number(resolved);
      if (!isNaN(parsed)) count = parsed;
    }
  }

  // Extract form content handling nested braces (e.g. "{# tasks out of {total}}")
  function extractForm(prefix: string): string | null {
    const idx = forms.indexOf(prefix);
    if (idx === -1) return null;
    const start = forms.indexOf("{", idx + prefix.length);
    if (start === -1) return null;
    // Count braces to find matching close
    let depth = 0;
    for (let i = start; i < forms.length; i++) {
      if (forms[i] === "{") depth++;
      else if (forms[i] === "}") { depth--; if (depth === 0) return forms.slice(start + 1, i); }
    }
    return null;
  }

  // Check for exact match first (=0, =1)
  const exact = extractForm(`=${count} `) ?? extractForm(`=${count}{`);
  if (exact !== null) return exact.replace(/#/g, String(count));

  // Then check named forms
  const formName = count === 0 ? "zero" : count === 1 ? "one" : "other";
  const named = extractForm(`${formName} `) ?? extractForm(`${formName}{`);
  if (named !== null) return named.replace(/#/g, String(count));

  // Fallback to "other"
  if (formName !== "other") {
    const other = extractForm("other ") ?? extractForm("other{");
    if (other !== null) return other.replace(/#/g, String(count));
  }

  return template;
}

// Handle ICU select: "{is_done, select, true {Reopen task} other {Mark complete}}"
function resolveSelect(template: string, tParams?: Record<string, any>, ctx?: PreviewContext): string {
  const match = template.match(/\{(\w+),\s*select,\s*(.+)\}/s);
  if (!match) return template;

  const paramName = match[1];
  const options = match[2];

  let paramValue = "other";
  if (tParams && ctx) {
    const raw = tParams[paramName];
    if (raw !== undefined) {
      paramValue = typeof raw === "string" ? resolveBinding(raw, ctx) : String(raw);
    }
  }

  // Look for exact match
  const exactMatch = options.match(new RegExp(`${paramValue}\\s*\\{([^}]*)\\}`));
  if (exactMatch) return exactMatch[1];

  // Fallback to "other"
  const otherMatch = options.match(/other\s*\{([^}]*)\}/);
  if (otherMatch) return otherMatch[1];

  return template;
}

// ── binding resolution ──────────────────────────────────────────────

function resolveBinding(expr: string, ctx: PreviewContext): string {
  if (!expr || typeof expr !== "string") return String(expr ?? "");

  // Locale reference
  if (expr.startsWith("$t:")) {
    return resolveLocale(ctx.locale, expr, undefined, ctx);
  }

  // Binding expression: {data.field} or {data.field | format:name}
  if (expr.startsWith("{") && expr.endsWith("}")) {
    return resolveBindingExpr(expr.slice(1, -1).trim(), ctx);
  }

  // Template with mixed text and bindings: "text {binding} more"
  if (expr.includes("{") && expr.includes("}")) {
    return expr.replace(/\{([^}]+)\}/g, (_, inner) => resolveBindingExpr(inner.trim(), ctx));
  }

  // Direct data path (no braces)
  const directValue = resolveDotPath(expr, ctx);
  if (directValue !== undefined) return String(directValue);

  return expr;
}

function resolveBindingExpr(expr: string, ctx: PreviewContext): string {
  // Check for pipes: "data.field | format:name"
  const pipeIndex = expr.indexOf("|");
  if (pipeIndex > -1) {
    const path = expr.slice(0, pipeIndex).trim();
    const pipe = expr.slice(pipeIndex + 1).trim();
    return applyPipe(path, pipe, ctx);
  }

  // Check for ternary (deferred — show placeholder)
  if (expr.includes("?")) {
    return "[conditional]";
  }

  // Check for comparison (e.g. "item.status == done")
  if (expr.includes("==")) {
    const [left, right] = expr.split("==").map((s) => s.trim());
    const leftVal = String(resolveDotPath(left, ctx) ?? left);
    const rightVal = right.replace(/['"]/g, "");
    return String(leftVal === rightVal);
  }

  // Simple path
  const val = resolveDotPath(expr, ctx);
  return val !== undefined ? String(val) : `[${expr}]`;
}

function applyPipe(path: string, pipe: string, ctx: PreviewContext): string {
  const rawValue = resolveDotPath(path, ctx);

  if (pipe.startsWith("format:")) {
    const formatName = pipe.slice(7);
    // Check manifest formatters
    const formatter = ctx.manifest?.formatters?.[formatName];
    if (formatter?.mapping) {
      const key = rawValue !== undefined ? String(rawValue) : Object.keys(formatter.mapping)[0];
      const mapped = formatter.mapping[key];
      if (mapped) {
        // If the mapped value is a locale ref, resolve it
        if (typeof mapped === "string" && mapped.startsWith("$t:")) {
          return resolveLocale(ctx.locale, mapped, undefined, ctx);
        }
        return String(mapped);
      }
    }
    // Complex formatters — show placeholder
    if (formatName === "date_relative" || formatName === "date") {
      return rawValue !== undefined ? String(rawValue) : "[date]";
    }
    return rawValue !== undefined ? String(rawValue) : `[${formatName}]`;
  }

  if (pipe.startsWith("map:")) {
    const mapName = pipe.slice(4);
    const mapper = ctx.manifest?.mappers?.[mapName];
    if (mapper && rawValue !== undefined) {
      return String(mapper[String(rawValue)] ?? rawValue);
    }
    return String(rawValue ?? `[${mapName}]`);
  }

  if (pipe.startsWith("default:")) {
    const fallback = pipe.slice(8).replace(/^['"]|['"]$/g, "");
    if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
      return String(rawValue);
    }
    // Fallback might be a locale ref
    if (fallback.startsWith("$t:")) {
      return resolveLocale(ctx.locale, fallback, undefined, ctx);
    }
    return fallback;
  }

  return String(rawValue ?? `[${pipe}]`);
}

function resolveDotPath(path: string, ctx: PreviewContext): any {
  const parts = path.split(".");
  const root = parts[0];

  let data: any;
  if (root === "state") {
    // Use defaults from screen's state block
    const stateKey = parts[1];
    data = ctx.screen[ctx.screenName]?.state?.[stateKey]?.default;
    if (parts.length === 2) return data;
    // Navigate deeper if needed
    for (let i = 2; i < parts.length; i++) {
      if (data == null) return undefined;
      data = data[parts[i]];
    }
    return data;
  }

  if (root === "params") {
    data = ctx.mockParams;
    for (let i = 1; i < parts.length; i++) {
      if (data == null) return undefined;
      data = data[parts[i]];
    }
    return data;
  }

  // Try mock data first
  data = ctx.mockData;
  for (const part of parts) {
    if (data == null) return undefined;
    data = data[part];
  }
  if (data !== undefined) return data;

  // Try from data keys defined in screen
  const screenDef = ctx.screen[ctx.screenName];
  if (screenDef?.data && root in screenDef.data) {
    data = ctx.mockData[root];
    if (data === undefined) return undefined;
    for (let i = 1; i < parts.length; i++) {
      if (data == null) return undefined;
      data = data[parts[i]];
    }
    return data;
  }

  return undefined;
}

// ── item context for collections ────────────────────────────────────

function resolveWithItem(expr: string, item: any, ctx: PreviewContext): string {
  if (!expr || typeof expr !== "string") return String(expr ?? "");

  // Also handle standalone "item" (for simple arrays like tags)
  if (expr === "item" && typeof item !== "object") {
    return String(item);
  }

  // For binding expressions with {item.X}, resolve each binding block individually
  if (expr.includes("{") && expr.includes("}")) {
    const result = expr.replace(/\{([^}]+)\}/g, (_, inner) => {
      const trimmed = inner.trim();
      // Replace item.X refs in this binding expression
      const withItemResolved = trimmed.replace(/\bitem\.(\w+(?:\.\w+)*)/g, (_m: string, path: string) => {
        let val: any = item;
        for (const p of path.split(".")) {
          if (val == null) return `[item.${path}]`;
          val = val[p];
        }
        return val !== undefined ? String(val) : `[item.${path}]`;
      });

      // If it has a pipe, apply it
      const pipeIdx = withItemResolved.indexOf("|");
      if (pipeIdx > -1) {
        const valuePart = withItemResolved.slice(0, pipeIdx).trim();
        const pipePart = withItemResolved.slice(pipeIdx + 1).trim();
        return applyPipeWithValue(valuePart, pipePart, ctx);
      }

      // If it starts with $t:, resolve locale
      if (withItemResolved.startsWith("$t:")) {
        return resolveLocale(ctx.locale, withItemResolved, undefined, ctx);
      }

      // Try as a dot path first, otherwise return as literal
      const resolved = resolveDotPath(withItemResolved, ctx);
      return resolved !== undefined ? String(resolved) : withItemResolved;
    });

    // Resolve any remaining $t: references outside braces
    return result.replace(/\$t:([\w.]+)/g, (match) => {
      return resolveLocale(ctx.locale, match, undefined, ctx);
    });
  }

  // Simple item.X path (no braces)
  const replaced = expr.replace(/\bitem\.(\w+(?:\.\w+)*)/g, (_, path) => {
    let val: any = item;
    for (const p of path.split(".")) {
      if (val == null) return `[item.${path}]`;
      val = val[p];
    }
    return val !== undefined ? String(val) : `[item.${path}]`;
  });

  // After item substitution, resolve any $t: references that appeared
  const withLocale = replaced.replace(/\$t:([\w.]+)/g, (match) => {
    return resolveLocale(ctx.locale, match, undefined, ctx);
  });

  return resolveBinding(withLocale, ctx);
}

function applyPipeWithValue(value: string, pipe: string, ctx: PreviewContext): string {
  if (pipe.startsWith("format:")) {
    const formatName = pipe.slice(7);
    const formatter = ctx.manifest?.formatters?.[formatName];
    if (formatter?.mapping) {
      const mapped = formatter.mapping[value];
      if (mapped) {
        if (typeof mapped === "string" && mapped.startsWith("$t:")) {
          return resolveLocale(ctx.locale, mapped, undefined, ctx);
        }
        return String(mapped);
      }
    }
    if (formatName === "date_relative" || formatName === "date") {
      return value || "[date]";
    }
    return value || `[${formatName}]`;
  }

  if (pipe.startsWith("map:")) {
    const mapName = pipe.slice(4);
    const mapper = ctx.manifest?.mappers?.[mapName];
    if (mapper) {
      return String(mapper[value] ?? value);
    }
    return value;
  }

  if (pipe.startsWith("default:")) {
    const fallback = pipe.slice(8).replace(/^['"]|['"]$/g, "");
    if (value) return value;
    if (fallback.startsWith("$t:")) return resolveLocale(ctx.locale, fallback, undefined, ctx);
    return fallback;
  }

  return value;
}

// ── spec-defined contract token defaults ────────────────────────────
// These are the built-in tokens from the OpenUISpec specification.
// Project `contracts/*.yaml` extensions and screen-level `tokens_override`
// merge on top of these. This makes rendering spec-driven, not hardcoded.

const CONTRACT_TOKENS: Record<string, Record<string, any>> = {
  data_display: {
    card: {
      background: "color.surface.primary",
      border: { width: 0.5, color: "color.border.default" },
      radius: "spacing.md",
      padding: "spacing.md",
      title_style: "typography.heading_sm",
      subtitle_style: "typography.body_sm",
      body_style: "typography.body",
    },
    compact: {
      min_height: 44,
      padding_v: "spacing.sm",
      padding_h: "spacing.md",
      title_style: "typography.body",
      subtitle_style: "typography.caption",
      separator: { color: "color.border.default", inset_leading: "spacing.md" },
    },
    hero: {
      padding: "spacing.lg",
      title_style: "typography.display",
      subtitle_style: "typography.body",
    },
    stat: {
      padding: "spacing.md",
      background: "color.surface.secondary",
      radius: "spacing.sm",
      label_style: "typography.caption",
      value_style: "typography.heading_lg",
    },
    inline: {
      padding: "spacing.xs",
      title_style: "typography.body_sm",
    },
  },
  action_trigger: {
    primary: {
      background: "color.brand.primary",
      text: "color.brand.primary.on_color",
      min_height: 44,
      padding_h: "spacing.md",
      radius: "spacing.sm",
    },
    secondary: {
      background: "color.surface.secondary",
      text: "color.text.primary",
      border: { width: 1, color: "color.border.emphasis" },
      min_height: 44,
      padding_h: "spacing.md",
      radius: "spacing.sm",
    },
    tertiary: {
      background: "transparent",
      text: "color.brand.primary",
      min_height: 36,
      padding_h: "spacing.sm",
    },
    destructive: {
      background: "color.semantic.danger",
      text: "color.semantic.danger.on_color",
      min_height: 44,
      padding_h: "spacing.md",
      radius: "spacing.sm",
    },
    ghost: {
      background: "transparent",
      text: "color.text.secondary",
      min_height: 36,
      padding_h: "spacing.xs",
    },
  },
  input_field: {
    text: {
      min_height: 44,
      padding_h: "spacing.md",
      padding_v: "spacing.sm",
      background: "color.surface.primary",
      border: { width: 1, color: "color.border.default" },
      radius: "spacing.sm",
      label_style: "typography.caption",
      value_style: "typography.body",
      placeholder_color: "color.text.tertiary",
    },
    toggle: {
      track_width: 51,
      track_height: 31,
      thumb_size: 27,
      track_on: "color.brand.primary",
      track_off: "color.border.emphasis",
    },
  },
  nav_container: {
    tab_bar: {
      height: 49,
      background: "color.surface.primary",
      border_top: { width: 0.5, color: "color.border.default" },
      icon_size: 24,
      label_style: "typography.caption",
    },
    sidebar: {
      width_expanded: 240,
      background: "color.surface.secondary",
      item_height: 44,
      item_radius: "spacing.sm",
      item_padding_h: "spacing.md",
      icon_size: 20,
      label_style: "typography.body_sm",
    },
    rail: {
      width: 72,
      icon_size: 24,
      label_style: "typography.caption",
    },
  },
};

/**
 * Resolve a contract token value. Priority:
 *  1. Screen-instance tokens_override (highest)
 *  2. Project contract extension tokens
 *  3. Spec-defined defaults (CONTRACT_TOKENS)
 */
function resolveContractToken(
  contract: string,
  variant: string,
  tokenKey: string,
  tokensOverride: Record<string, any>,
  ctx: PreviewContext,
): string | undefined {
  // 1. Instance override
  if (tokensOverride[tokenKey] !== undefined) {
    const val = tokensOverride[tokenKey];
    if (typeof val === "string") {
      return resolveTokenPath(ctx.tokens, val) ?? val;
    }
    return typeof val === "number" ? `${val}px` : String(val);
  }

  // 2. Project contract extension tokens
  const contractDefs = ctx.manifest?._contractDefs;
  const projectTokens = contractDefs?.[contract]?.[contract]?.tokens?.[variant];
  if (projectTokens?.[tokenKey] !== undefined) {
    const val = projectTokens[tokenKey];
    if (typeof val === "string") {
      return resolveTokenPath(ctx.tokens, val) ?? val;
    }
    return typeof val === "number" ? `${val}px` : String(val);
  }

  // 3. Spec defaults
  const specTokens = CONTRACT_TOKENS[contract]?.[variant];
  if (specTokens?.[tokenKey] !== undefined) {
    const val = specTokens[tokenKey];
    if (typeof val === "string") {
      return resolveTokenPath(ctx.tokens, val) ?? val;
    }
    return typeof val === "number" ? `${val}px` : String(val);
  }

  return undefined;
}

// ── icon rendering ──────────────────────────────────────────────────

const ICON_MAP: Record<string, string> = {
  checkmark: "&#x2713;",
  checkmark_circle: "&#x2713;",
  checkmark_circle_fill: "&#x2713;",
  checkmark_list: "&#x2611;",
  checkmark_list_fill: "&#x2611;",
  plus: "&#x002B;",
  plus_circle: "&#x2295;",
  pencil: "&#x270E;",
  trash: "&#x1F5D1;",
  search: "&#x1F50D;",
  gear: "&#x2699;",
  gear_fill: "&#x2699;",
  folder: "&#x1F4C1;",
  folder_fill: "&#x1F4C2;",
  calendar: "&#x1F4C5;",
  calendar_fill: "&#x1F4C5;",
  clock: "&#x1F551;",
  tag: "&#x1F3F7;",
  person: "&#x1F464;",
  chevron_right: "&#x276F;",
  chevron_left: "&#x276E;",
  flag: "&#x2691;",
  flag_fill: "&#x2691;",
  circle_fill: "&#x25CF;",
  star: "&#x2606;",
  star_fill: "&#x2605;",
  heart: "&#x2661;",
  arrow_uturn_left: "&#x21A9;",
  square_arrow_up: "&#x2B06;",
  exclamationmark_triangle: "&#x26A0;",
};

function renderIcon(name: string, size: number, color: string): string {
  const symbol = ICON_MAP[name] ?? ICON_MAP[name.replace(/_fill$/, "")] ?? "&#x25CB;";
  return `<span style="font-size: ${Math.round(size * 0.85)}px; line-height: 1; color: ${color}; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; font-style: normal;">${symbol}</span>`;
}

// ── contract → HTML rendering ───────────────────────────────────────

function renderSection(section: any, ctx: PreviewContext, depth = 0): string {
  if (!section) return "";

  // Handle condition
  if (section.condition) {
    const condResult = evaluateCondition(section.condition, ctx);
    if (!condResult) return "";
  }

  // Handle adaptive — pick the right branch
  const adaptedSection = applyAdaptive(section, ctx.sizeClass);

  // Determine layout
  const layout = adaptedSection.layout ?? {};
  const adaptedLayout = applyAdaptive(layout, ctx.sizeClass);

  const containerStyle = buildContainerStyle(adaptedSection, ctx);
  const layoutStyle = buildLayoutStyle(adaptedLayout, ctx);

  const id = adaptedSection.id ? ` id="${escapeHtml(adaptedSection.id)}"` : "";
  const position = adaptedSection.position;
  let positionStyle = "";
  if (position === "floating-bottom-trailing") {
    // Dynamically compute bottom offset from nav height + spacing
    const screenDef = ctx.screen[ctx.screenName];
    const nav = screenDef?.navigation;
    const adaptedNav = nav ? applyAdaptive(nav, ctx.sizeClass) : undefined;
    const navVariant = adaptedNav?.variant ?? "tab_bar";
    let bottomOffset = 0;
    if (nav && navVariant === "tab_bar") {
      const navTokensOverride = adaptedNav?.tokens_override ?? {};
      const tabHeight = parseInt(resolveContractToken("nav_container", "tab_bar", "height", navTokensOverride, ctx) ?? "49", 10);
      bottomOffset = tabHeight;
    }
    // Add spacing offset
    const spacingOffset = parseInt(sp(ctx, "lg", 24).replace("px", ""), 10);
    const rightOffset = sp(ctx, "lg", 24);
    positionStyle = `position: fixed; bottom: ${bottomOffset + spacingOffset}px; right: ${rightOffset}; z-index: 100; `;
  }

  // If this section IS a contract (leaf node), wrap it with container styles
  if (adaptedSection.contract) {
    const inner = renderContract(adaptedSection, ctx, depth);
    // Only wrap if there's container/position styling to apply
    if (containerStyle || positionStyle) {
      return `<div${id} style="${positionStyle}${containerStyle}">${inner}</div>`;
    }
    return inner;
  }

  // Render children
  const children = adaptedSection.children ?? adaptedSection.sections ?? [];
  const childrenHtml = children.map((child: any) => renderSection(child, ctx, depth + 1)).join("\n");

  return `<div${id} style="${positionStyle}${containerStyle}${layoutStyle}">${childrenHtml}</div>`;
}

function renderCustomContractPlaceholder(
  contract: string,
  variant: string,
  props: Record<string, any>,
  ctx: PreviewContext,
): string {
  const def = ctx.manifest?._contractDefs?.[contract]?.[contract];
  if (!def) {
    return `<div class="contract-placeholder" style="padding: ${sp(ctx,"sm",12)}; border: 1px dashed ${FALLBACK.borderDefault}; border-radius: ${sp(ctx,"sm",8)}; color: ${FALLBACK.textTertiary}; font-size: 13px; text-align: center;">[${contract}${variant !== "default" ? `:${variant}` : ""}]</div>`;
  }

  const tokenDef = def.tokens?.[variant] ?? def.tokens?.[Object.keys(def.tokens ?? {})[0]] ?? {};

  const minHeightRaw = tokenDef.min_height;
  const minHeightPx = Array.isArray(minHeightRaw) ? minHeightRaw[0] : minHeightRaw;
  const minHeightCSS = minHeightPx ? `min-height: ${minHeightPx}px;` : "";

  const bgPath = tokenDef.background;
  const bg = bgPath
    ? (resolveColor(ctx, bgPath) ?? resolveTokenPath(ctx.tokens, bgPath) ?? FALLBACK.surfaceSecondary)
    : FALLBACK.surfaceSecondary;

  const radiusPath = tokenDef.radius;
  const radius = radiusPath
    ? (resolveTokenPath(ctx.tokens, radiusPath) ?? sp(ctx, "sm", 8))
    : sp(ctx, "sm", 8);

  const borderDef = tokenDef.border;
  const borderCSS = borderDef
    ? `border: ${borderDef.width ?? 1}px solid ${resolveColor(ctx, borderDef.color) ?? resolveTokenPath(ctx.tokens, borderDef.color) ?? FALLBACK.borderDefault};`
    : `border: 1px dashed ${FALLBACK.borderDefault};`;

  const paddingPath = tokenDef.padding;
  const padding = paddingPath
    ? (resolveTokenPath(ctx.tokens, paddingPath) ?? sp(ctx, "md", 16))
    : sp(ctx, "md", 16);

  const semantic = def.semantic ?? "";

  const webMappingForVariant = def.platform_mapping?.web?.[variant];
  const webMappingFallback = def.platform_mapping?.web;
  const webMapping = webMappingForVariant ?? (typeof webMappingFallback === "object" && !Array.isArray(webMappingFallback) ? webMappingFallback : undefined);
  const platformHint = webMapping ? (webMapping.component ?? webMapping.element ?? "") : "";

  const propLines: string[] = [];
  if (props && def.props) {
    for (const [key] of Object.entries(def.props as Record<string, any>)) {
      if (props[key] !== undefined) {
        propLines.push(`${key}: ${escapeHtml(resolveBinding(String(props[key]), ctx))}`);
      }
    }
  }

  const headerColor = resolveColor(ctx, "color.text.tertiary") ?? FALLBACK.textTertiary;
  const bodyColor = resolveColor(ctx, "color.text.secondary") ?? FALLBACK.textSecondary;

  return `<div class="contract-placeholder" style="padding: ${padding}; background: ${bg}; border-radius: ${radius}; ${borderCSS} ${minHeightCSS} display: flex; flex-direction: column; justify-content: center; gap: ${sp(ctx,"xs",4)};">
    <div style="display: flex; align-items: center; gap: ${sp(ctx,"sm",8)};">
      <span style="${getTypographyCSS(ctx.tokens, "caption")} color: ${headerColor}; text-transform: uppercase; letter-spacing: 0.05em;">${escapeHtml(contract)}${variant !== "default" ? `.${escapeHtml(variant)}` : ""}</span>
      ${platformHint ? `<span style="${getTypographyCSS(ctx.tokens, "caption")} color: ${headerColor}; opacity: 0.7;">· ${escapeHtml(platformHint)}</span>` : ""}
    </div>
    ${semantic ? `<div style="${getTypographyCSS(ctx.tokens, "body_sm")} color: ${bodyColor};">${escapeHtml(semantic)}</div>` : ""}
    ${propLines.length > 0 ? `<div style="${getTypographyCSS(ctx.tokens, "caption")} color: ${headerColor}; margin-top: ${sp(ctx,"xs",4)};">${propLines.map(p => escapeHtml(p)).join(" · ")}</div>` : ""}
  </div>`;
}

function renderContract(section: any, ctx: PreviewContext, depth: number): string {
  const contract = section.contract;
  const variant = section.variant ?? "default";
  const adapted = applyAdaptive(section, ctx.sizeClass);
  const props = adapted.props ?? {};

  switch (contract) {
    case "data_display":
      return renderDataDisplay(adapted, props, ctx);
    case "action_trigger":
      return renderActionTrigger(adapted, props, ctx);
    case "input_field":
      return renderInputField(adapted, props, ctx);
    case "collection":
      return renderCollection(adapted, props, ctx, depth);
    case "nav_container":
      return renderNavContainer(adapted, props, ctx);
    case "feedback":
    case "surface":
      return ""; // Not visible by default
    default:
      return renderCustomContractPlaceholder(contract, variant, props, ctx);
  }
}

function renderDataDisplay(section: any, props: any, ctx: PreviewContext): string {
  const variant = section.variant ?? "card";
  const tokensOverride = section.tokens_override ?? {};
  const interactive = section.interactive ?? false;

  const title = props.title ? resolveBinding(props.title, ctx) : "";
  const subtitle = props.subtitle ? resolveBinding(props.subtitle, ctx) : "";
  const body = props.body ? resolveBinding(props.body, ctx) : "";

  // Resolve locale with t_params
  let resolvedTitle = title;
  if (props.title?.startsWith?.("$t:") && props.t_params) {
    const resolvedParams: Record<string, any> = {};
    for (const [k, v] of Object.entries(props.t_params)) {
      resolvedParams[k] = typeof v === "string" ? resolveBinding(v, ctx) : v;
    }
    resolvedTitle = resolveLocale(ctx.locale, props.title, resolvedParams, ctx);
  }

  let resolvedSubtitle = subtitle;
  if (props.subtitle?.startsWith?.("$t:") && props.t_params) {
    const resolvedParams: Record<string, any> = {};
    for (const [k, v] of Object.entries(props.t_params)) {
      resolvedParams[k] = typeof v === "string" ? resolveBinding(v, ctx) : v;
    }
    resolvedSubtitle = resolveLocale(ctx.locale, props.subtitle, resolvedParams, ctx);
  }

  // Resolve typography from contract tokens → tokens_override → spec defaults
  const ct = (key: string) => resolveContractToken("data_display", variant, key, tokensOverride, ctx);

  const titleStyleName = (ct("title_style") ?? "heading_sm").replace("typography.", "");
  let titleStyle = getTypographyCSS(ctx.tokens, titleStyleName);
  let titleColor = resolveColor(ctx, "color.text.primary") ?? FALLBACK.textPrimary;
  if (tokensOverride.title_color) {
    titleColor = resolveTokenPath(ctx.tokens, tokensOverride.title_color) ?? titleColor;
  }
  const subtitleStyleName = (ct("subtitle_style") ?? "body_sm").replace("typography.", "");
  const bodyStyleName = (ct("body_style") ?? "body").replace("typography.", "");

  const containerStyle = buildContainerStyle(section, ctx);
  const cursor = interactive ? "cursor: pointer; " : "";

  if (variant === "inline") {
    const inlinePadding = ct("padding") ?? "4px";
    // Handle badge in inline variant (e.g. priority dot)
    let badgeHtml = "";
    if (props.badge) {
      if (props.badge.dot) {
        const severity = props.badge.severity ? resolveBinding(String(props.badge.severity), ctx) : "neutral";
        const severityColor = getSeverityColor(severity, ctx);
        badgeHtml = `<span style="width: ${sp(ctx,"sm",8)}; height: ${sp(ctx,"sm",8)}; border-radius: 50%; background: ${severityColor}; display: inline-block; flex-shrink: 0;"></span>`;
      } else {
        badgeHtml = renderBadge(props.badge, ctx);
      }
    }
    return `<div style="${containerStyle}${cursor} display: flex; align-items: center; gap: ${sp(ctx,"xs",4)}; padding: ${inlinePadding};">
      ${badgeHtml}
      <span style="${titleStyle} color: ${titleColor};">${escapeHtml(resolvedTitle)}</span>
      ${resolvedSubtitle ? `<span style="${getTypographyCSS(ctx.tokens, subtitleStyleName)} color: ${resolveColor(ctx, "color.text.secondary") ?? FALLBACK.textSecondary}; margin-left: ${sp(ctx,"xxs",2)};">${escapeHtml(resolvedSubtitle)}</span>` : ""}
    </div>`;
  }

  if (variant === "hero") {
    const heroPadding = ct("padding") ?? "24px";
    const badge = props.badge ? renderBadge(props.badge, ctx) : "";
    const metadata = props.metadata ? renderMetadata(props.metadata, ctx) : "";
    return `<div style="${containerStyle} padding: ${heroPadding};">
      <div style="${getTypographyCSS(ctx.tokens, titleStyleName)} color: ${titleColor};">${escapeHtml(resolvedTitle)}</div>
      ${badge}${metadata}
    </div>`;
  }

  if (variant === "stat") {
    const statPadding = ct("padding") ?? "16px";
    const statBg = ct("background") ?? FALLBACK.surfaceSecondary;
    const statRadius = ct("radius") ?? "8px";
    const labelStyleName = (ct("label_style") ?? "caption").replace("typography.", "");
    const valueStyleName = (ct("value_style") ?? "heading_lg").replace("typography.", "");
    const leading = props.leading ? renderLeading(props.leading, ctx) : "";
    return `<div style="${containerStyle} padding: ${statPadding}; background: ${statBg}; border-radius: ${statRadius};">
      <div style="${getTypographyCSS(ctx.tokens, labelStyleName)} color: ${resolveColor(ctx, "color.text.tertiary") ?? FALLBACK.textTertiary}; margin-bottom: ${sp(ctx,"xs",4)};">${escapeHtml(resolvedTitle)}</div>
      <div style="display: flex; align-items: center; gap: ${sp(ctx,"xs",4)};">
        ${leading}
        <span style="${getTypographyCSS(ctx.tokens, valueStyleName)} color: ${titleColor};">${escapeHtml(body || resolvedSubtitle)}</span>
      </div>
    </div>`;
  }

  if (variant === "compact") {
    const compactPaddingV = ct("padding_v") ?? "8px";
    const separatorColor = resolveColor(ctx, "color.border.default") ?? FALLBACK.borderDefault;
    const leading = props.leading ? renderLeading(props.leading, ctx) : "";
    const trailing = props.trailing ? renderTrailing(props.trailing, ctx) : "";
    return `<div style="${containerStyle}${cursor} display: flex; align-items: center; padding: ${compactPaddingV} 0; border-bottom: 1px solid ${separatorColor};">
      ${leading}
      <div style="flex: 1; min-width: 0;">
        <div style="${getTypographyCSS(ctx.tokens, titleStyleName)} color: ${titleColor};">${escapeHtml(resolvedTitle)}</div>
        ${resolvedSubtitle ? `<div style="${getTypographyCSS(ctx.tokens, subtitleStyleName)} color: ${resolveColor(ctx, "color.text.secondary") ?? FALLBACK.textSecondary};">${escapeHtml(resolvedSubtitle)}</div>` : ""}
      </div>
      ${trailing}
    </div>`;
  }

  // Default "card" variant
  const cardPadding = ct("padding") ?? "16px";
  const cardBg = ct("background") ?? FALLBACK.surfacePrimary;
  const cardRadius = ct("radius") ?? "16px";
  const leading = props.leading ? renderLeading(props.leading, ctx) : "";
  const trailing = props.trailing ? renderTrailing(props.trailing, ctx) : "";
  const cardShadow = resolveTokenPath(ctx.tokens, "elevation.sm") ?? "0 1px 2px rgba(0,0,0,0.04)";
  return `<div style="${containerStyle}${cursor} padding: ${cardPadding}; background: ${cardBg}; border-radius: ${cardRadius}; display: flex; align-items: center; gap: ${sp(ctx,"sm",8)}; box-shadow: ${cardShadow};">
    ${leading}
    <div style="flex: 1; min-width: 0;">
      <div style="${titleStyle} color: ${titleColor};">${escapeHtml(resolvedTitle)}</div>
      ${resolvedSubtitle ? `<div style="${getTypographyCSS(ctx.tokens, subtitleStyleName)} color: ${resolveColor(ctx, "color.text.secondary") ?? FALLBACK.textSecondary}; margin-top: ${sp(ctx,"xxs",2)};">${escapeHtml(resolvedSubtitle)}</div>` : ""}
    </div>
    ${trailing}
  </div>`;
}

function renderLeading(leading: any, ctx: PreviewContext): string {
  if (typeof leading === "object" && leading.icon) {
    const color = leading.color ? (resolveTokenPath(ctx.tokens, leading.color) ?? leading.color) : FALLBACK.textSecondary;
    const size = leading.size ?? 20;
    const iconName = typeof leading.icon === "string" ? leading.icon : (leading.ref ?? "circle_fill");
    return `<span style="margin-right: ${sp(ctx,"sm",8)}; flex-shrink: 0;">${renderIcon(iconName, size, color)}</span>`;
  }
  if (typeof leading === "object" && leading.media) {
    const size = leading.size ?? 40;
    const radius = leading.radius ?? 8;
    const bg = leading.fallback?.background
      ? (resolveTokenPath(ctx.tokens, leading.fallback.background) ?? FALLBACK.brand)
      : FALLBACK.brand;
    // Resolve initials from mock data if possible
    const initialsSource = leading.fallback?.initials;
    let initials = "U";
    if (initialsSource && ctx) {
      const name = resolveDotPath(initialsSource, ctx);
      if (typeof name === "string" && name.length > 0) {
        initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
      }
    }
    return `<div style="width: ${size}px; height: ${size}px; border-radius: ${radius}px; background: ${bg}; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: ${size * 0.35}px; margin-right: ${sp(ctx,"sm",8)};">${initials}</div>`;
  }
  if (typeof leading === "object" && leading.contract) {
    return renderContract(leading, ctx, 0);
  }
  return "";
}

function renderTrailing(trailing: any, ctx: PreviewContext): string {
  if (typeof trailing === "string") {
    const resolved = resolveBinding(trailing, ctx);
    return `<span style="${getTypographyCSS(ctx.tokens, "body_sm")} color: ${resolveColor(ctx, "color.text.secondary") ?? FALLBACK.textSecondary}; flex-shrink: 0;">${escapeHtml(resolved)}</span>`;
  }
  if (typeof trailing === "object" && trailing.icon) {
    const color = resolveTokenPath(ctx.tokens, trailing.color ?? "color.text.tertiary") ?? FALLBACK.textTertiary;
    const iconName = typeof trailing.icon === "string" ? trailing.icon : "chevron_right";
    const size = trailing.size ?? 14;
    return `<span style="flex-shrink: 0; margin-left: ${sp(ctx,"xs",4)};">${renderIcon(iconName, size, color)}</span>`;
  }
  if (typeof trailing === "object" && trailing.contract) {
    return `<span style="flex-shrink: 0;">${renderContract(trailing, ctx, 0)}</span>`;
  }
  if (typeof trailing === "object" && trailing.dot) {
    const severity = trailing.severity ? resolveBinding(String(trailing.severity), ctx) : "neutral";
    const severityColor = getSeverityColor(severity, ctx);
    return `<span style="width: ${sp(ctx,"sm",8)}; height: ${sp(ctx,"sm",8)}; border-radius: 50%; background: ${severityColor}; display: inline-block; flex-shrink: 0;"></span>`;
  }
  return "";
}

function renderBadge(badge: any, ctx: PreviewContext): string {
  if (!badge) return "";
  const text = badge.text ? resolveBinding(badge.text, ctx) : "";
  const severity = badge.severity ? resolveBinding(badge.severity, ctx) : "neutral";
  const severityColor = getSeverityColor(severity, ctx);
  return `<span style="display: inline-block; padding: ${sp(ctx,"xs",4)} ${sp(ctx,"sm",8)}; border-radius: ${sp(ctx,"xs",4)}; background: ${colorWithAlpha(severityColor, 0.13)}; color: ${severityColor}; ${getTypographyCSS(ctx.tokens, "caption")} font-weight: 500; margin-top: ${sp(ctx,"sm",8)};">${escapeHtml(text)}</span>`;
}

function renderMetadata(metadata: any, ctx: PreviewContext): string {
  if (!metadata) return "";
  const items: string[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    const resolved = resolveBinding(String(value), ctx);
    items.push(`<span style="${getTypographyCSS(ctx.tokens, "caption")} color: ${resolveColor(ctx, "color.text.secondary") ?? FALLBACK.textSecondary};">${escapeHtml(resolved)}</span>`);
  }
  return items.length ? `<div style="display: flex; gap: ${sp(ctx,"sm",8)}; margin-top: ${sp(ctx,"sm",8)};">${items.join("")}</div>` : "";
}

function renderActionTrigger(section: any, props: any, ctx: PreviewContext): string {
  const variant = section.variant ?? "primary";
  const adapted = applyAdaptive(section, ctx.sizeClass);
  const fullWidth = adapted.full_width ?? false;
  const tokensOverride = adapted.tokens_override ?? {};
  const size = adapted.size ?? "md";

  const ct = (key: string) => resolveContractToken("action_trigger", variant, key, tokensOverride, ctx);

  const label = props.label ? resolveBinding(props.label, ctx) : "";

  // Resolve label with t_params
  let resolvedLabel = label;
  if (props.label?.startsWith?.("$t:") && props.t_params) {
    const resolvedParams: Record<string, any> = {};
    for (const [k, v] of Object.entries(props.t_params)) {
      resolvedParams[k] = typeof v === "string" ? resolveBinding(v, ctx) : v;
    }
    resolvedLabel = resolveLocale(ctx.locale, props.label, resolvedParams, ctx);
    // Handle ICU select in result
    if (resolvedLabel.includes("select,")) {
      resolvedLabel = resolveSelect(resolvedLabel, resolvedParams, ctx);
    }
  }

  // Resolve colors from contract tokens (spec defaults → project overrides → instance overrides)
  let bg = ct("background") ?? FALLBACK.brand;
  let color = ct("text") ?? FALLBACK.onBrand;
  let border = "none";

  // Handle border from contract tokens
  const borderToken = CONTRACT_TOKENS.action_trigger?.[variant]?.border;
  if (borderToken && typeof borderToken === "object") {
    const bColor = resolveTokenPath(ctx.tokens, borderToken.color) ?? FALLBACK.borderDefault;
    border = `${borderToken.width ?? 1}px solid ${bColor}`;
  }

  // Token overrides for color (legacy support)
  if (tokensOverride.text) {
    color = resolveTokenPath(ctx.tokens, tokensOverride.text) ?? color;
  }

  const paddingH = ct("padding_h") ?? (size === "lg" ? sp(ctx,"xl",28) : size === "sm" ? sp(ctx,"sm",12) : sp(ctx,"md",20));
  const paddingV = size === "lg" ? sp(ctx,"md",14) : size === "sm" ? sp(ctx,"xs",6) : sp(ctx,"sm",10);
  const padding = `${paddingV} ${paddingH}`;
  const radius = ct("radius") ?? "8px";
  const width = fullWidth ? "width: 100%; " : "";
  let shadow = "";
  if (tokensOverride.shadow && tokensOverride.shadow !== "none") {
    const resolved = resolveTokenPath(ctx.tokens, tokensOverride.shadow);
    if (resolved && resolved !== "none") {
      shadow = `box-shadow: ${resolved}; `;
    }
  }

  const containerStyle = buildContainerStyle(section, ctx);

  const iconName = props.icon ? resolveBinding(String(props.icon), ctx) : "";
  const iconHtml = iconName ? renderIcon(iconName, size === "lg" ? 20 : 16, color) : "";

  return `<button style="${containerStyle}${width}display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: ${padding}; background: ${bg}; color: ${color}; border: ${border}; border-radius: ${radius}; ${getTypographyCSS(ctx.tokens, "body")} font-weight: 500; cursor: pointer; ${shadow}">${iconHtml}${escapeHtml(resolvedLabel)}</button>`;
}

function renderInputField(section: any, props: any, ctx: PreviewContext): string {
  const inputType = section.input_type ?? "text";
  const tokensOverride = section.tokens_override ?? {};
  // Map input_type to the contract token variant name (most map to "text")
  const tokenVariant = inputType === "toggle" ? "toggle" : "text";
  const ct = (key: string) => resolveContractToken("input_field", tokenVariant, key, tokensOverride, ctx);

  const label = props.label ? resolveBinding(props.label, ctx) : "";
  const placeholder = props.placeholder ? resolveBinding(props.placeholder, ctx) : "";
  const value = props.value ? resolveBinding(props.value, ctx) : "";
  const helperText = props.helper_text ? resolveBinding(props.helper_text, ctx) : "";

  const bg = ct("background") ?? FALLBACK.surfacePrimary;
  const borderColor = resolveColor(ctx, "color.border.default") ?? FALLBACK.borderDefault;
  const borderWidth = tokensOverride.border?.width ?? CONTRACT_TOKENS.input_field?.text?.border?.width ?? 1;
  const radius = ct("radius") ?? "8px";

  const containerStyle = buildContainerStyle(section, ctx);

  if (inputType === "toggle") {
    const isOn = value === "true" || value === true;
    const trackOn = ct("track_on") ?? FALLBACK.brand;
    const trackOff = ct("track_off") ?? FALLBACK.borderDefault;
    const trackColor = isOn ? trackOn : trackOff;
    const trackW = parseInt(ct("track_width") ?? "51", 10);
    const trackH = parseInt(ct("track_height") ?? "31", 10);
    const thumbSize = parseInt(ct("thumb_size") ?? "27", 10);
    const thumbOffset = Math.round((trackH - thumbSize) / 2);
    return `<div style="${containerStyle} display: flex; align-items: center; justify-content: space-between; padding: ${sp(ctx,"sm",12)} 0; border-bottom: 1px solid ${borderColor};">
      <span style="${getTypographyCSS(ctx.tokens, "body")}">${escapeHtml(label)}</span>
      <div style="width: ${trackW}px; height: ${trackH}px; border-radius: ${trackH / 2}px; background: ${trackColor}; position: relative;">
        <div style="width: ${thumbSize}px; height: ${thumbSize}px; border-radius: 50%; background: white; position: absolute; top: ${thumbOffset}px; ${isOn ? `right: ${thumbOffset}px` : `left: ${thumbOffset}px`}; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
      </div>
    </div>
    ${helperText ? `<div style="${getTypographyCSS(ctx.tokens, "caption")} color: ${resolveColor(ctx, "color.text.tertiary") ?? FALLBACK.textTertiary}; margin-top: ${sp(ctx,"xxs",2)};">${escapeHtml(helperText)}</div>` : ""}`;
  }

  if (inputType === "select") {
    const options = props.options ?? [];
    const optionsHtml = options.map((opt: any) => {
      const optLabel = opt.label ? resolveBinding(opt.label, ctx) : opt.value;
      const selected = value === opt.value ? " selected" : "";
      return `<option value="${escapeHtml(opt.value)}"${selected}>${escapeHtml(optLabel)}</option>`;
    }).join("");
    return `<div style="${containerStyle} display: flex; align-items: center; justify-content: space-between; padding: ${sp(ctx,"sm",12)} 0; border-bottom: 1px solid ${borderColor};">
      <span style="${getTypographyCSS(ctx.tokens, "body")}">${escapeHtml(label)}</span>
      <select style="padding: ${sp(ctx,"xs",6)} ${sp(ctx,"sm",10)}; border: 1px solid ${borderColor}; border-radius: ${sp(ctx,"xs",6)}; ${getTypographyCSS(ctx.tokens, "body_sm")} background: ${bg}; color: inherit;">${optionsHtml}</select>
    </div>`;
  }

  if (inputType === "checkbox") {
    const isChecked = value === "true" || value === true;
    const brandColor = resolveColor(ctx, "color.brand.primary") ?? FALLBACK.brand;
    const successColor = resolveColor(ctx, "color.semantic.success") ?? FALLBACK.success;
    const checkColor = isChecked ? successColor : brandColor;
    return `<div style="${containerStyle} display: flex; align-items: center; margin-right: ${sp(ctx,"sm",10)}; flex-shrink: 0;">
      <div style="width: 22px; height: 22px; border-radius: 11px; border: 2px solid ${isChecked ? checkColor : borderColor}; background: ${isChecked ? checkColor : "transparent"}; display: flex; align-items: center; justify-content: center;">
        ${isChecked ? `<span style="color: white; font-size: 13px; line-height: 1;">&#x2713;</span>` : ""}
      </div>
    </div>`;
  }

  // Default text input
  const maxWidth = section.adaptive?.[ctx.sizeClass]?.max_width;
  const maxWidthStyle = maxWidth ? `max-width: ${maxWidth}px; ` : "";
  return `<div style="${containerStyle}${maxWidthStyle}">
    <input type="text" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" style="width: 100%; padding: ${sp(ctx,"sm",10)} ${sp(ctx,"sm",12)}; border: ${borderWidth}px solid ${borderColor}; border-radius: ${radius}; ${getTypographyCSS(ctx.tokens, "body")} background: ${bg}; box-sizing: border-box;" />
  </div>`;
}

function renderCollection(section: any, props: any, ctx: PreviewContext, depth: number): string {
  const variant = section.variant ?? "list";
  const data = props.data;
  const itemContract = props.item_contract;
  const itemVariant = props.item_variant;
  const itemPropsMap = props.item_props_map ?? {};

  // Resolve data — could be a string path to mock data array
  let items: any[] = [];
  if (typeof data === "string") {
    const resolved = resolveDotPath(data, ctx);
    if (Array.isArray(resolved)) items = resolved;
  } else if (Array.isArray(data)) {
    items = data;
  }

  // Empty state
  if (items.length === 0 && props.empty_state) {
    const es = props.empty_state;
    const title = es.title ? resolveBinding(es.title, ctx) : "";
    const body = es.body ? resolveBinding(es.body, ctx) : "";
    return `<div style="text-align: center; padding: 48px 24px;">
      <div style="${getTypographyCSS(ctx.tokens, "heading")} color: ${resolveColor(ctx, "color.text.primary") ?? FALLBACK.textPrimary}; margin-bottom: 8px;">${escapeHtml(title)}</div>
      <div style="${getTypographyCSS(ctx.tokens, "body_sm")} color: ${resolveColor(ctx, "color.text.secondary") ?? FALLBACK.textSecondary};">${escapeHtml(body)}</div>
    </div>`;
  }

  const containerStyle = buildContainerStyle(section, ctx);

  if (variant === "chips" || variant === "chip_row") {
    const chipItems = items.map((item) => {
      const chipProps: Record<string, any> = {};
      for (const [key, expr] of Object.entries(itemPropsMap)) {
        chipProps[key] = resolveWithItem(String(expr), item, ctx);
      }
      const label = chipProps.label ?? (typeof item === "object" ? item.label : String(item));
      const resolvedLabel = typeof label === "string" && label.startsWith("$t:")
        ? resolveLocale(ctx.locale, label, undefined, ctx)
        : label;
      const brandPrimary = resolveColor(ctx, "color.brand.primary") ?? FALLBACK.brand;
      const isSelected = item.id === (resolveDotPath(String(props.selected ?? ""), ctx) ?? "");
      const bg = isSelected ? colorWithAlpha(brandPrimary, 0.08) : "transparent";
      const color = isSelected ? brandPrimary : (resolveColor(ctx, "color.text.primary") ?? FALLBACK.textPrimary);
      const border = isSelected ? `1px solid ${brandPrimary}` : `1px solid ${resolveColor(ctx, "color.border.default") ?? FALLBACK.borderDefault}`;
      return `<button style="padding: ${sp(ctx,"xs",6)} ${sp(ctx,"sm",14)}; border-radius: 20px; background: ${bg}; color: ${color}; border: ${border}; ${getTypographyCSS(ctx.tokens, "body_sm")} cursor: pointer; white-space: nowrap;">${escapeHtml(String(resolvedLabel))}</button>`;
    }).join("");
    return `<div style="${containerStyle} display: flex; gap: ${sp(ctx,"sm",8)}; overflow-x: auto; flex-wrap: wrap;">${chipItems}</div>`;
  }

  // Shared item resolver for all list-like variants
  function resolveCollectionItem(item: any): string {
    const mappedProps: Record<string, any> = {};
    for (const [key, expr] of Object.entries(itemPropsMap)) {
      if (typeof expr === "string") {
        mappedProps[key] = resolveWithItem(expr, item, ctx);
      } else if (typeof expr === "object") {
        mappedProps[key] = expr; // Pass through complex objects like leading/trailing
      }
    }

    const contractSection = {
      contract: itemContract,
      variant: itemVariant ?? "compact",
      props: { ...mappedProps },
      interactive: props.interactive ?? false,
    };

    // Resolve leading contract within item context (e.g. checkbox)
    if (mappedProps.leading && typeof mappedProps.leading === "object" && mappedProps.leading.contract) {
      const leadingProps = { ...mappedProps.leading.props };
      if (leadingProps.value && typeof leadingProps.value === "string") {
        leadingProps.value = resolveWithItem(leadingProps.value, item, ctx);
      }
      contractSection.props.leading = { ...mappedProps.leading, props: leadingProps };
    }

    // Resolve trailing contract within item context (e.g. priority dot)
    if (mappedProps.trailing && typeof mappedProps.trailing === "object" && mappedProps.trailing.contract) {
      const trailingProps = { ...mappedProps.trailing.props };
      if (trailingProps.badge && typeof trailingProps.badge === "object") {
        const resolvedBadge = { ...trailingProps.badge };
        if (resolvedBadge.severity && typeof resolvedBadge.severity === "string") {
          resolvedBadge.severity = resolveWithItem(resolvedBadge.severity, item, ctx);
        }
        trailingProps.badge = resolvedBadge;
      }
      contractSection.props.trailing = { ...mappedProps.trailing, props: trailingProps };
    }

    return renderContract(contractSection, ctx, depth + 1);
  }

  // Grid variant
  if (variant === "grid") {
    const columns = props.columns ?? 2;
    const gap = resolveTokenPath(ctx.tokens, props.gap ?? "spacing.md") ?? sp(ctx, "md", 16);
    const gridItems = items.map((item) => resolveCollectionItem(item)).join("");
    return `<div style="${containerStyle} display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: ${gap};">${gridItems}</div>`;
  }

  // Horizontal scroll / carousel variants
  if (variant === "horizontal_scroll" || variant === "carousel") {
    const gap = resolveTokenPath(ctx.tokens, props.gap ?? "spacing.sm") ?? sp(ctx, "sm", 8);
    const scrollItems = items.map((item) =>
      `<div style="flex-shrink: 0;">${resolveCollectionItem(item)}</div>`
    ).join("");
    return `<div style="${containerStyle} display: flex; overflow-x: auto; gap: ${gap}; -webkit-overflow-scrolling: touch;">${scrollItems}</div>`;
  }

  // List variant (default)
  const listItems = items.map((item) => resolveCollectionItem(item)).join("");

  return `<div style="${containerStyle}">${listItems}</div>`;
}

function renderNavContainer(section: any, props: any, ctx: PreviewContext): string {
  const adapted = applyAdaptive(section, ctx.sizeClass);
  const variant = adapted.variant ?? "tab_bar";
  const tokensOverride = adapted.tokens_override ?? {};
  const ct = (key: string) => resolveContractToken("nav_container", variant, key, tokensOverride, ctx);
  const items = props.items ?? [];
  const selected = props.selected ?? "";

  const brandPrimary = resolveColor(ctx, "color.brand.primary") ?? FALLBACK.brand;
  const textSecondary = resolveColor(ctx, "color.text.secondary") ?? FALLBACK.textSecondary;
  const surface = ct("background") ?? FALLBACK.surfacePrimary;
  const border = resolveColor(ctx, "color.border.default") ?? FALLBACK.borderDefault;
  const iconSize = parseInt(ct("icon_size") ?? "24", 10);
  const labelStyleName = (ct("label_style") ?? "caption").replace("typography.", "");

  if (variant === "tab_bar") {
    const tabHeight = parseInt(ct("height") ?? "49", 10);
    const tabs = items.map((item: any) => {
      const label = item.label ? resolveBinding(item.label, ctx) : "";
      const isSelected = item.id === selected;
      const color = isSelected ? brandPrimary : textSecondary;
      const iconName = isSelected ? (item.icon_active ?? item.icon ?? "") : (item.icon ?? "");
      // Badge
      let badgeHtml = "";
      if (item.badge) {
        const count = item.badge.count ? resolveDotPath(String(item.badge.count), ctx) : undefined;
        if (count !== undefined && Number(count) > 0) {
          badgeHtml = `<span style="position: absolute; top: -4px; right: -8px; min-width: 16px; height: 16px; border-radius: 8px; background: ${brandPrimary}; color: white; font-size: 10px; font-weight: 600; display: flex; align-items: center; justify-content: center; padding: 0 4px;">${count}</span>`;
        }
      }
      return `<div style="flex: 1; text-align: center; padding: ${sp(ctx,"sm",8)} 0; color: ${color}; ${getTypographyCSS(ctx.tokens, labelStyleName)} cursor: pointer;">
        <div style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: ${iconSize + 4}px; height: ${iconSize}px; margin: 0 auto ${sp(ctx,"xxs",2)}; border-radius: ${(iconSize + 4) / 2}px; background: ${isSelected ? colorWithAlpha(brandPrimary, 0.08) : "transparent"};">
          ${iconName ? renderIcon(iconName, iconSize, color) : ""}
          ${badgeHtml}
        </div>
        ${escapeHtml(label)}
      </div>`;
    }).join("");
    return `<nav style="position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: ${surface}; border-top: 1px solid ${border}; padding: ${sp(ctx,"xs",6)} 0 env(safe-area-inset-bottom, ${sp(ctx,"sm",8)}); z-index: 50;">${tabs}</nav>`;
  }

  if (variant === "rail") {
    const railWidth = parseInt(ct("width") ?? "72", 10);
    const railItems = items.map((item: any) => {
      const label = item.label ? resolveBinding(item.label, ctx) : "";
      const isSelected = item.id === selected;
      const color = isSelected ? brandPrimary : textSecondary;
      const iconName = isSelected ? (item.icon_active ?? item.icon ?? "") : (item.icon ?? "");
      return `<div style="text-align: center; padding: ${sp(ctx,"sm",12)} ${sp(ctx,"sm",8)}; color: ${color}; ${getTypographyCSS(ctx.tokens, labelStyleName)} cursor: pointer;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: ${iconSize + 4}px; height: ${iconSize}px; margin: 0 auto ${sp(ctx,"xs",4)}; border-radius: ${(iconSize + 4) / 2}px; background: ${isSelected ? colorWithAlpha(brandPrimary, 0.08) : "transparent"};">
          ${iconName ? renderIcon(iconName, iconSize, color) : ""}
        </div>
        ${escapeHtml(label)}
      </div>`;
    }).join("");
    return `<nav style="position: fixed; left: 0; top: 0; bottom: 0; width: ${railWidth}px; display: flex; flex-direction: column; align-items: center; background: ${surface}; border-right: 1px solid ${border}; padding-top: ${sp(ctx,"md",16)}; z-index: 50;">${railItems}</nav>`;
  }

  if (variant === "sidebar") {
    const sidebarWidth = parseInt(ct("width_expanded") ?? "240", 10);
    const itemRadius = ct("item_radius") ?? "8px";
    const itemPaddingH = ct("item_padding_h") ?? "16px";
    const sidebarItems = items.map((item: any) => {
      const label = item.label ? resolveBinding(item.label, ctx) : "";
      const isSelected = item.id === selected;
      const bg = isSelected ? colorWithAlpha(brandPrimary, 0.08) : "transparent";
      const color = isSelected ? brandPrimary : (resolveColor(ctx, "color.text.primary") ?? FALLBACK.textPrimary);
      const iconName = isSelected ? (item.icon_active ?? item.icon ?? "") : (item.icon ?? "");
      return `<div style="padding: ${sp(ctx,"sm",10)} ${itemPaddingH}; margin: ${sp(ctx,"xxs",2)} ${sp(ctx,"sm",8)}; border-radius: ${itemRadius}; background: ${bg}; color: ${color}; ${getTypographyCSS(ctx.tokens, labelStyleName)} cursor: pointer; display: flex; align-items: center; gap: ${sp(ctx,"sm",12)};">
        ${iconName ? renderIcon(iconName, iconSize, color) : ""}
        ${escapeHtml(label)}
      </div>`;
    }).join("");
    return `<nav style="position: fixed; left: 0; top: 0; bottom: 0; width: ${sidebarWidth}px; display: flex; flex-direction: column; background: ${surface}; border-right: 1px solid ${border}; padding-top: ${sp(ctx,"md",16)}; z-index: 50;">${sidebarItems}</nav>`;
  }

  return "";
}

// ── helpers ──────────────────────────────────────────────────────────

function applyAdaptive(section: any, sizeClass: string): any {
  if (!section?.adaptive) return section;

  const adaptive = section.adaptive;
  // Find the best match: exact > fallback to broader
  let override: any = null;
  if (adaptive[sizeClass]) {
    override = adaptive[sizeClass];
  } else if (sizeClass === "regular" && adaptive.compact) {
    override = adaptive.compact;
  } else if (sizeClass === "expanded") {
    override = adaptive.regular ?? adaptive.compact;
  }

  if (!override) return section;

  // Merge override into section (shallow)
  const merged = { ...section };
  for (const [key, value] of Object.entries(override)) {
    if (key === "adaptive") continue;
    if (typeof value === "object" && !Array.isArray(value) && merged[key] && typeof merged[key] === "object") {
      merged[key] = { ...merged[key], ...value };
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function evaluateCondition(condition: string, ctx: PreviewContext): boolean {
  if (condition.includes("!=")) {
    const [left, right] = condition.split("!=").map((s) => s.trim());
    const leftVal = resolveDotPath(left, ctx);
    const rightVal = right === "null" ? null : right.replace(/['"]/g, "");
    return leftVal != rightVal;
  }
  if (condition.includes("==")) {
    const [left, right] = condition.split("==").map((s) => s.trim());
    const leftVal = resolveDotPath(left, ctx);
    const rightVal = right.replace(/['"]/g, "");
    return String(leftVal) === rightVal;
  }
  // Truthy check
  const val = resolveDotPath(condition, ctx);
  return !!val;
}

function getSeverityColor(severity: string, ctx: PreviewContext): string {
  const map: Record<string, string> = {
    success: resolveColor(ctx, "color.semantic.success") ?? FALLBACK.success,
    warning: resolveColor(ctx, "color.semantic.warning") ?? FALLBACK.warning,
    error: resolveColor(ctx, "color.semantic.danger") ?? FALLBACK.danger,
    danger: resolveColor(ctx, "color.semantic.danger") ?? FALLBACK.danger,
    info: resolveColor(ctx, "color.semantic.info") ?? FALLBACK.info,
    neutral: resolveColor(ctx, "color.text.tertiary") ?? FALLBACK.textTertiary,
  };
  return map[severity] ?? map.neutral;
}

function buildContainerStyle(section: any, ctx: PreviewContext): string {
  let style = "";

  // Padding — full or directional
  if (section.padding) {
    const val = resolveTokenPath(ctx.tokens, section.padding);
    if (val) style += `padding: ${val}; `;
  }
  if (section.padding_h) {
    const val = resolveTokenPath(ctx.tokens, section.padding_h);
    if (val) {
      // page_margin resolves to "16px 16px" (v h) — extract horizontal component
      const parts = val.split(" ");
      const h = parts.length > 1 ? parts[1] : parts[0];
      style += `padding-left: ${h}; padding-right: ${h}; `;
    }
  }
  if (section.padding_v) {
    const val = resolveTokenPath(ctx.tokens, section.padding_v);
    if (val) {
      const parts = val.split(" ");
      const v = parts[0];
      style += `padding-top: ${v}; padding-bottom: ${v}; `;
    }
  }

  // Margins
  if (section.margin_top) {
    const val = resolveTokenPath(ctx.tokens, section.margin_top);
    if (val) style += `margin-top: ${val.split(" ")[0]}; `;
  }
  if (section.margin_bottom) {
    const val = resolveTokenPath(ctx.tokens, section.margin_bottom);
    if (val) style += `margin-bottom: ${val.split(" ")[0]}; `;
  }

  // Max width (from adaptive or direct)
  if (section.max_width) {
    style += `max-width: ${section.max_width}px; `;
  }

  // tokens_override spacing — margin_bottom used in some overrides
  if (section.tokens_override?.margin_bottom) {
    const val = resolveTokenPath(ctx.tokens, section.tokens_override.margin_bottom);
    if (val) style += `margin-bottom: ${val.split(" ")[0]}; `;
  }

  return style;
}

function buildLayoutStyle(layout: any, ctx: PreviewContext): string {
  if (!layout?.type) return "";

  const type = layout.type;

  // Resolve spacing with spec-defined defaults per layout primitive
  const defaultSpacing: Record<string, string> = {
    stack: "spacing.md",
    row: "spacing.sm",
    grid: "spacing.md",
  };
  const spacingRef = layout.spacing ?? defaultSpacing[type];
  const spacing = spacingRef ? (resolveTokenPath(ctx.tokens, spacingRef) ?? "0px") : "0px";
  const gap = layout.gap ? (resolveTokenPath(ctx.tokens, layout.gap) ?? "0px") : spacing;
  const align = layout.align ?? "stretch";

  const alignMap: Record<string, string> = {
    center: "center",
    leading: "flex-start",
    trailing: "flex-end",
    stretch: "stretch",
  };

  switch (type) {
    case "stack":
      return `display: flex; flex-direction: column; gap: ${gap}; align-items: ${alignMap[align] ?? align}; `;
    case "row":
      return `display: flex; flex-direction: row; gap: ${gap}; align-items: center; ${layout.wrap ? "flex-wrap: wrap; " : ""}`;
    case "grid": {
      const cols = layout.columns ?? 2;
      return `display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: ${gap}; `;
    }
    case "scroll_vertical":
      return "display: flex; flex-direction: column; overflow-y: auto; ";
    case "split_view":
      return "display: flex; flex-direction: row; ";
    default:
      return "";
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── generic fallback palette ─────────────────────────────────────────
// Neutral defaults used when tokens are missing. NOT project-specific.
const FALLBACK = {
  brand:        "#0066CC",
  onBrand:      "#FFFFFF",
  textPrimary:  "#1A1A1A",
  textSecondary:"#666666",
  textTertiary: "#999999",
  surfacePrimary:   "#FFFFFF",
  surfaceSecondary: "#F5F5F5",
  borderDefault:    "#E0E0E0",
  danger:       "#CC3333",
  warning:      "#CC8800",
  success:      "#339933",
  info:         "#3366CC",
  darkBg:       "#1A1A1A",
  darkText:     "#E0E0E0",
};

// ── page assembly ───────────────────────────────────────────────────

export function renderPage(ctx: PreviewContext): string {
  const screenDef = ctx.screen[ctx.screenName];
  if (!screenDef) {
    return `<!DOCTYPE html><html><body><p>Screen "${ctx.screenName}" not found.</p></body></html>`;
  }

  const bgColor = resolveColor(ctx, "color.surface.primary")
    ?? (ctx.theme === "dark" ? FALLBACK.darkBg : FALLBACK.surfacePrimary);
  const textColor = resolveColor(ctx, "color.text.primary")
    ?? (ctx.theme === "dark" ? FALLBACK.darkText : FALLBACK.textPrimary);

  const fontFamily = ctx.tokens.typography?.typography?.font_family?.primary?.value ?? "system-ui";

  // Render navigation if present
  let navHtml = "";
  let contentMargin = "";
  if (screenDef.navigation) {
    navHtml = renderNavContainer(screenDef.navigation, screenDef.navigation.props ?? {}, ctx);
    const adapted = applyAdaptive(screenDef.navigation, ctx.sizeClass);
    const navVariant = adapted.variant ?? "tab_bar";
    const navTokensOverride = adapted.tokens_override ?? {};
    if (navVariant === "tab_bar") {
      const tabHeight = parseInt(resolveContractToken("nav_container", "tab_bar", "height", navTokensOverride, ctx) ?? "49", 10);
      contentMargin = `padding-bottom: ${tabHeight + 12}px; `;
    } else if (navVariant === "rail") {
      const railWidth = parseInt(resolveContractToken("nav_container", "rail", "width", navTokensOverride, ctx) ?? "72", 10);
      contentMargin = `margin-left: ${railWidth}px; `;
    } else if (navVariant === "sidebar") {
      const sidebarWidth = parseInt(resolveContractToken("nav_container", "sidebar", "width_expanded", navTokensOverride, ctx) ?? "240", 10);
      contentMargin = `margin-left: ${sidebarWidth}px; `;
    }
  }

  // Build layout
  const layout = screenDef.layout ?? {};
  const adaptedLayout = applyAdaptive(layout, ctx.sizeClass);
  const sections = adaptedLayout.sections ?? layout.sections ?? [];
  const layoutType = adaptedLayout.type ?? "scroll_vertical";
  const safeArea = adaptedLayout.safe_area ?? layout.safe_area ?? false;
  const safeAreaPadding = safeArea ? "padding-top: 44px; " : "";

  // Resolve layout-level padding
  // Sources (in priority order):
  //   1. Explicit layout.padding / padding_h / padding_v on the screen
  //   2. Default margin from layout.size_classes.<current_size_class>.margin tokens
  // When safe_area is active, use directional properties to avoid overriding padding-top.
  let layoutPadding = "";
  const hasExplicitPadding = adaptedLayout.padding || adaptedLayout.padding_h || adaptedLayout.padding_v;

  if (adaptedLayout.padding) {
    const val = resolveTokenPath(ctx.tokens, adaptedLayout.padding);
    if (val) {
      const parts = val.split(" ");
      const v = parts[0];
      const h = parts.length > 1 ? parts[1] : v;
      if (safeArea) {
        layoutPadding += `padding-bottom: ${v}; padding-left: ${h}; padding-right: ${h}; `;
      } else {
        layoutPadding += `padding: ${val}; `;
      }
    }
  }
  if (adaptedLayout.padding_h) {
    const val = resolveTokenPath(ctx.tokens, adaptedLayout.padding_h);
    if (val) {
      const parts = val.split(" ");
      const h = parts.length > 1 ? parts[1] : parts[0];
      layoutPadding += `padding-left: ${h}; padding-right: ${h}; `;
    }
  }
  if (adaptedLayout.padding_v) {
    const val = resolveTokenPath(ctx.tokens, adaptedLayout.padding_v);
    if (val) {
      const parts = val.split(" ");
      const v = parts[0];
      layoutPadding += `padding-top: ${v}; padding-bottom: ${v}; `;
    }
  }

  // Fallback: apply size_class default margin from layout tokens
  if (!hasExplicitPadding) {
    const sizeClassDef = ctx.tokens.layout?.layout?.size_classes?.[ctx.sizeClass];
    if (sizeClassDef?.margin) {
      // margin can be a spacing token ref like "spacing.md" or just a scale name like "md"
      const marginRef = sizeClassDef.margin.includes(".") ? sizeClassDef.margin : `spacing.${sizeClassDef.margin}`;
      const val = resolveTokenPath(ctx.tokens, marginRef);
      if (val) {
        const parts = val.split(" ");
        const m = parts.length > 1 ? parts[1] : parts[0];
        layoutPadding += `padding-left: ${m}; padding-right: ${m}; `;
        // Also apply vertical padding unless safe_area already provides top padding
        if (!safeArea) {
          layoutPadding += `padding-top: ${m}; `;
        }
        layoutPadding += `padding-bottom: ${m}; `;
      }
    }
  }

  let bodyHtml: string;
  if (layoutType === "split_view") {
    const primarySections = adaptedLayout.primary?.sections ?? [];
    const primaryWidth = adaptedLayout.primary_width ?? 0.38;
    const primaryHtml = primarySections
      .map((sId: string) => {
        const sec = sections.find((s: any) => s.id === sId);
        return sec ? renderSection(sec, ctx) : "";
      })
      .join("");
    bodyHtml = `<div style="display: flex; height: 100%;">
      <div style="width: ${primaryWidth * 100}%; overflow-y: auto; border-right: 1px solid ${resolveColor(ctx, "color.border.default") ?? FALLBACK.borderDefault};">${primaryHtml}</div>
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: ${resolveColor(ctx, "color.text.tertiary") ?? FALLBACK.textTertiary}; ${getTypographyCSS(ctx.tokens, "body_sm")}">Select an item</div>
    </div>`;
  } else {
    // Resolve section_gap — default spacing between top-level sections
    const sectionGap = resolveTokenPath(ctx.tokens, "spacing.section_gap") ?? "24px";
    const wrapperStyle = `${safeAreaPadding}${layoutPadding}display: flex; flex-direction: column; gap: ${sectionGap}; `.trim();
    const sectionsHtml = sections.map((section: any) => renderSection(section, ctx)).join("\n");
    bodyHtml = wrapperStyle
      ? `<div style="${wrapperStyle}">${sectionsHtml}</div>`
      : sectionsHtml;
  }

  return `<!DOCTYPE html>
<html lang="${ctx.locale.$locale ?? "en"}" dir="${ctx.locale.$direction ?? "ltr"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; }
  body {
    background: ${bgColor};
    color: ${textColor};
    font-family: '${fontFamily}', system-ui, -apple-system, sans-serif;
    font-size: ${(() => { const bodyScale = ctx.tokens.typography?.typography?.scale?.body; const size = bodyScale ? (typeof bodyScale.size === "object" ? bodyScale.size.base : bodyScale.size) : 16; return `${size}px`; })()};
    line-height: ${ctx.tokens.typography?.typography?.scale?.body?.line_height ?? 1.5};
    -webkit-font-smoothing: antialiased;
    ${contentMargin}
  }
  button { font-family: inherit; }
  input, select, textarea { font-family: inherit; color: inherit; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
${navHtml}
${bodyHtml}
</body>
</html>`;
}
