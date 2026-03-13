/**
 * Emits Swift token files: Color+Tokens, Typography+Tokens, Spacing+Tokens,
 * Elevation+Tokens, Motion+Tokens, AppTheme.
 */

import type { IR } from "../ir/types.js";
import { fileHeader, hexToSwiftColor, swiftFontWeight, camelCase } from "./swift-utils.js";

export function emitColorTokens(ir: IR): string {
  let code = fileHeader("Color+Tokens.swift");
  code += `\nextension Color {\n`;

  // Group by category
  const cats = new Map<string, typeof ir.colors>();
  for (const c of ir.colors) {
    const arr = cats.get(c.category) ?? [];
    arr.push(c);
    cats.set(c.category, arr);
  }

  for (const [cat, colors] of cats) {
    code += `    // MARK: - ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n\n`;
    for (const c of colors) {
      const propName = camelCase(c.name);
      code += `    static let ${propName} = ${hexToSwiftColor(c.hex)}\n`;
    }
    code += `\n`;
  }

  code += `}\n`;
  return code;
}

export function emitTypographyTokens(ir: IR): string {
  let code = fileHeader("Typography+Tokens.swift");
  code += `\nextension Font {\n`;
  code += `    // MARK: - Typography Scale\n\n`;

  for (const t of ir.typography) {
    const name = camelCase(t.name);
    const weight = swiftFontWeight(t.weight);
    code += `    static let ${name}: Font = .system(size: ${t.size}, weight: ${weight})\n`;
  }

  code += `}\n\n`;

  // View modifier for typography
  code += `struct TypographyModifier: ViewModifier {\n`;
  code += `    let font: Font\n`;
  code += `    let lineSpacing: CGFloat\n`;
  code += `    let tracking: CGFloat\n\n`;
  code += `    func body(content: Content) -> some View {\n`;
  code += `        content\n`;
  code += `            .font(font)\n`;
  code += `            .lineSpacing(lineSpacing)\n`;
  code += `            .tracking(tracking)\n`;
  code += `    }\n`;
  code += `}\n`;

  return code;
}

export function emitSpacingTokens(ir: IR): string {
  let code = fileHeader("Spacing+Tokens.swift");
  code += `\nenum Spacing {\n`;

  for (const s of ir.spacing) {
    const name = camelCase(s.name);
    code += `    static let ${name}: CGFloat = ${s.value}\n`;
  }

  code += `\n    // MARK: - Aliases\n`;
  code += `    static let pageMarginH: CGFloat = md\n`;
  code += `    static let pageMarginV: CGFloat = md\n`;
  code += `    static let cardPadding: CGFloat = md\n`;
  code += `    static let sectionGap: CGFloat = lg\n`;
  code += `    static let inlineGap: CGFloat = sm\n`;
  code += `    static let stackGap: CGFloat = md\n`;

  code += `}\n`;
  return code;
}

export function emitElevationTokens(ir: IR): string {
  let code = fileHeader("Elevation+Tokens.swift");
  code += `\nenum Elevation {\n`;

  for (const e of ir.elevations) {
    const name = camelCase(e.name);
    if (!e.shadow) {
      code += `    static let ${name} = Shadow(color: .clear, radius: 0, x: 0, y: 0)\n`;
    } else {
      code += `    static let ${name} = Shadow(color: .black.opacity(${e.shadow.opacity}), radius: ${e.shadow.radius}, x: 0, y: ${e.shadow.y})\n`;
    }
  }

  code += `\n    struct Shadow {\n`;
  code += `        let color: Color\n`;
  code += `        let radius: CGFloat\n`;
  code += `        let x: CGFloat\n`;
  code += `        let y: CGFloat\n`;
  code += `    }\n`;
  code += `}\n\n`;

  code += `extension View {\n`;
  code += `    func elevation(_ shadow: Elevation.Shadow) -> some View {\n`;
  code += `        self.shadow(color: shadow.color, radius: shadow.radius, x: shadow.x, y: shadow.y)\n`;
  code += `    }\n`;
  code += `}\n`;

  return code;
}

export function emitMotionTokens(): string {
  let code = fileHeader("Motion+Tokens.swift");
  code += `\nenum Motion {\n`;
  code += `    // MARK: - Durations\n`;
  code += `    static let instant: Double = 0.1\n`;
  code += `    static let quick: Double = 0.2\n`;
  code += `    static let normal: Double = 0.3\n`;
  code += `    static let slow: Double = 0.5\n\n`;
  code += `    // MARK: - Animations\n`;
  code += `    static let defaultAnimation: Animation = .easeOut(duration: normal)\n`;
  code += `    static let enterAnimation: Animation = .easeOut(duration: normal)\n`;
  code += `    static let exitAnimation: Animation = .easeIn(duration: quick)\n`;
  code += `    static let emphasisAnimation: Animation = .spring(response: normal, dampingFraction: 0.7)\n\n`;
  code += `    static func reduced(_ animation: Animation) -> Animation {\n`;
  code += `        .linear(duration: 0)\n`;
  code += `    }\n`;
  code += `}\n`;

  return code;
}

export function emitAppTheme(): string {
  let code = fileHeader("AppTheme.swift");
  code += `\nenum ThemeMode: String, CaseIterable {\n`;
  code += `    case system\n`;
  code += `    case light\n`;
  code += `    case dark\n`;
  code += `    case warm\n\n`;
  code += `    var colorScheme: ColorScheme? {\n`;
  code += `        switch self {\n`;
  code += `        case .system: return nil\n`;
  code += `        case .light: return .light\n`;
  code += `        case .dark: return .dark\n`;
  code += `        case .warm: return .light\n`;
  code += `        }\n`;
  code += `    }\n`;
  code += `}\n\n`;

  code += `@Observable\n`;
  code += `final class AppTheme {\n`;
  code += `    var mode: ThemeMode = .system\n\n`;
  code += `    var preferredColorScheme: ColorScheme? {\n`;
  code += `        mode.colorScheme\n`;
  code += `    }\n`;
  code += `}\n`;

  return code;
}
