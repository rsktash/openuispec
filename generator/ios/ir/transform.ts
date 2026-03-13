/**
 * Orchestrates all resolvers to produce the IR from a parsed SpecProject.
 */

import type { SpecProject } from "../parse/types.js";
import type { IR, ModelDef, ModelField } from "./types.js";
import { resolveColors, resolveTypography, resolveSpacing, resolveElevations } from "./resolve-tokens.js";
import { resolveIcons } from "./resolve-icons.js";
import { resolveLocaleStrings } from "./resolve-i18n.js";

function specTypeToSwift(field: { type: string; format?: string; values?: string[]; required?: boolean }): string {
  switch (field.type) {
    case "string": return "String";
    case "int": return "Int";
    case "bool": return "Bool";
    case "date": return "Date";
    case "datetime": return "Date";
    case "color_ref": return "String";
    case "icon_ref": return "String";
    case "media_ref": return "String";
    case "user": return "User";
    case "enum": return "String";
    default:
      if (field.type.startsWith("list<")) {
        const inner = field.type.slice(5, -1);
        const swiftInner = inner === "string" ? "String" : inner.charAt(0).toUpperCase() + inner.slice(1);
        return `[${swiftInner}]`;
      }
      return "String";
  }
}

function buildModels(project: SpecProject): ModelDef[] {
  const models: ModelDef[] = [];
  const dataModel = project.manifest.data_model;

  for (const [name, fields] of Object.entries(dataModel)) {
    const modelFields: ModelField[] = [];
    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      const optional = fieldDef.required === false;
      const swiftType = specTypeToSwift(fieldDef);
      let defaultValue: string | undefined;
      if (fieldDef.default !== undefined) {
        if (Array.isArray(fieldDef.default)) {
          defaultValue = "[]";
        } else if (typeof fieldDef.default === "string") {
          defaultValue = `"${fieldDef.default}"`;
        } else {
          defaultValue = String(fieldDef.default);
        }
      }
      modelFields.push({
        name: fieldName,
        type: swiftType,
        optional,
        defaultValue,
      });
    }
    models.push({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      fields: modelFields,
    });
  }

  return models;
}

export function transform(project: SpecProject): IR {
  return {
    projectName: project.manifest.project.name,
    colors: resolveColors(project),
    typography: resolveTypography(project),
    spacing: resolveSpacing(project),
    elevations: resolveElevations(project),
    icons: resolveIcons(project),
    localeStrings: resolveLocaleStrings(project.locales),
    models: buildModels(project),
    screens: Object.keys(project.screens),
    flows: Object.keys(project.flows),
  };
}
