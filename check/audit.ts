/**
 * Design quality audit for OpenUISpec projects.
 *
 * Checks token patterns and contract completeness to produce a numeric quality score.
 * Score formula: max(0, 100 - errors × 10 - warnings × 3)
 *
 * Usage:
 *   openuispec check --target web --audit
 *   openuispec check --target ios --audit --min-score 70
 *   openuispec check --target web --audit --format json
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import YAML from "yaml";

export interface AuditFinding {
  domain: string;
  rule: string;
  severity: "error" | "warning";
  message: string;
}

export interface AuditResult {
  score: number;
  errors: number;
  warnings: number;
  findings: AuditFinding[];
  passed: boolean;
  threshold: number;
}

const AI_DEFAULT_FONTS = new Set(["Inter", "Roboto", "Arial", "Open Sans"]);

function readYaml(path: string): any {
  try {
    return YAML.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function checkTypography(tokensDir: string, findings: AuditFinding[]): void {
  const doc = readYaml(join(tokensDir, "typography.yaml"));
  if (!doc?.typography) return;

  // Font diversity: primary must NOT be a common AI default
  const primaryFont = doc.typography.font_family?.primary?.value;
  if (typeof primaryFont === "string" && AI_DEFAULT_FONTS.has(primaryFont)) {
    findings.push({
      domain: "typography",
      rule: "font_diversity",
      severity: "error",
      message: `Primary font "${primaryFont}" is an AI-default choice. Use a distinctive brand font.`,
    });
  }

  // Scale usage: at least 4 distinct scale levels defined
  const scaleKeys = Object.keys(doc.typography.scale ?? {});
  if (scaleKeys.length > 0 && scaleKeys.length < 4) {
    findings.push({
      domain: "typography",
      rule: "scale_usage",
      severity: "warning",
      message: `Only ${scaleKeys.length} type scale level(s) defined. Use ≥4 distinct levels for clear hierarchy.`,
    });
  }
}

function checkColor(tokensDir: string, findings: AuditFinding[]): void {
  const doc = readYaml(join(tokensDir, "color.yaml"));
  if (!doc?.color) return;

  // Pure black/white check
  function scanForPure(obj: any, path: string): void {
    if (typeof obj !== "object" || obj === null) return;
    if (typeof obj.reference === "string") {
      const ref = obj.reference.toUpperCase();
      if (ref === "#000000" || ref === "#000") {
        findings.push({
          domain: "color",
          rule: "pure_black",
          severity: "error",
          message: `Token at ${path} uses pure black (#000000). Use a near-black with hue instead.`,
        });
      }
      if (ref === "#FFFFFF" || ref === "#FFF") {
        findings.push({
          domain: "color",
          rule: "pure_white",
          severity: "error",
          message: `Token at ${path} uses pure white (#FFFFFF). Use a slightly tinted white instead.`,
        });
      }
    }
    for (const [key, value] of Object.entries(obj)) {
      if (key !== "reference" && typeof value === "object") {
        scanForPure(value, `${path}.${key}`);
      }
    }
  }
  scanForPure(doc.color, "color");

  // Theme coverage: check themes.yaml for both light + dark
  {
    const themes = readYaml(join(tokensDir, "themes.yaml"));
    const themeKeys = Object.keys(themes?.themes ?? {});
    const hasLight = themeKeys.some((k) => k.includes("light"));
    const hasDark = themeKeys.some((k) => k.includes("dark"));
    if (!hasLight || !hasDark) {
      findings.push({
        domain: "color",
        rule: "theme_coverage",
        severity: "warning",
        message: "Both light and dark themes should be defined in tokens/themes.yaml.",
      });
    }
  }
}

function checkSpacing(tokensDir: string, findings: AuditFinding[]): void {
  const doc = readYaml(join(tokensDir, "spacing.yaml"));
  if (!doc?.spacing) return;

  // Scale usage: at least 4 distinct values
  const scale = doc.spacing.scale ?? {};
  const scaleCount = Object.keys(scale).length;
  if (scaleCount > 0 && scaleCount < 4) {
    findings.push({
      domain: "spacing",
      rule: "scale_usage",
      severity: "warning",
      message: `Only ${scaleCount} spacing scale value(s) defined. Define ≥4 for meaningful spatial rhythm.`,
    });
  }

  // Alias usage: page_margin and card_padding should exist
  const aliases = doc.spacing.aliases ?? {};
  const aliasKeys = Object.keys(aliases).map((k) => k.toLowerCase());
  if (!aliasKeys.some((k) => k.includes("page_margin") || k.includes("page"))) {
    findings.push({
      domain: "spacing",
      rule: "alias_page_margin",
      severity: "warning",
      message: "No page_margin alias found in spacing tokens. Define it for consistent screen padding.",
    });
  }
  if (!aliasKeys.some((k) => k.includes("card_padding") || k.includes("card"))) {
    findings.push({
      domain: "spacing",
      rule: "alias_card_padding",
      severity: "warning",
      message: "No card_padding alias found in spacing tokens. Define it for consistent card spacing.",
    });
  }
}

function checkMotion(tokensDir: string, findings: AuditFinding[]): void {
  const doc = readYaml(join(tokensDir, "motion.yaml"));
  if (!doc?.motion) return;

  // Duration variety: at least 2 distinct durations
  const durations = doc.motion.duration ?? {};
  const distinctDurations = new Set(Object.values(durations));
  if (Object.keys(durations).length > 0 && distinctDurations.size < 2) {
    findings.push({
      domain: "motion",
      rule: "duration_variety",
      severity: "warning",
      message: "Only 1 distinct duration value found. Use ≥2 distinct durations (e.g. quick + normal).",
    });
  }

  // Reduced motion: must be defined
  if (!doc.motion.reduced_motion) {
    findings.push({
      domain: "motion",
      rule: "reduced_motion",
      severity: "error",
      message: "motion.reduced_motion is not defined. Must specify policy for prefers-reduced-motion.",
    });
  }
}

function checkContracts(contractsDir: string, findings: AuditFinding[]): void {
  // All collections have empty_state in must_handle or variants
  {
    const doc = readYaml(join(contractsDir, "collection.yaml"));
    const collection = doc ? doc[Object.keys(doc)[0]] : null;
    if (collection) {
      const mustHandle: string[] = collection.generation?.must_handle ?? [];
      const hasEmptyState = mustHandle.some((s: string) => s.toLowerCase().includes("empty"));
      if (!hasEmptyState) {
        findings.push({
          domain: "contracts",
          rule: "collection_empty_state",
          severity: "warning",
          message: "collection contract does not list empty_state handling in generation.must_handle.",
        });
      }
    }
  }
}

export function buildAuditResult(projectDir: string, threshold: number = 0): AuditResult {
  const manifest = readYaml(join(projectDir, "openuispec.yaml"));
  const tokensDir = resolve(projectDir, manifest?.includes?.tokens ?? "./tokens/");
  const contractsDir = resolve(projectDir, manifest?.includes?.contracts ?? "./contracts/");

  // Use audit_threshold from manifest if no CLI override
  const effectiveThreshold = threshold > 0 ? threshold : (manifest?.generation_guidance?.audit_threshold ?? 0);

  const findings: AuditFinding[] = [];
  checkTypography(tokensDir, findings);
  checkColor(tokensDir, findings);
  checkSpacing(tokensDir, findings);
  checkMotion(tokensDir, findings);
  checkContracts(contractsDir, findings);

  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const score = Math.max(0, 100 - errors * 10 - warnings * 3);

  return {
    score,
    errors,
    warnings,
    findings,
    passed: score >= effectiveThreshold,
    threshold: effectiveThreshold,
  };
}

export function formatAuditResult(result: AuditResult): string {
  const lines: string[] = [
    `Design Quality Score: ${result.score}/100`,
    `Errors: ${result.errors}  Warnings: ${result.warnings}`,
    result.threshold > 0 ? `Threshold: ${result.threshold} — ${result.passed ? "PASS" : "FAIL"}` : "",
    "",
  ].filter((l) => l !== "" || lines?.length === 0);

  if (result.findings.length === 0) {
    lines.push("No issues found.");
  } else {
    for (const f of result.findings) {
      lines.push(`[${f.severity.toUpperCase()}] [${f.domain}] ${f.message}`);
    }
  }

  return lines.join("\n");
}
