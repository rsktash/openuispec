/**
 * Emits Swift model structs from the data_model.
 */

import type { IR } from "../ir/types.js";
import { fileHeader, camelCase } from "./swift-utils.js";

export function emitModels(ir: IR): string {
  let code = fileHeader("Models.swift");
  code += `import Foundation\n\n`;

  for (const model of ir.models) {
    code += `struct ${model.name}: Identifiable, Hashable {\n`;

    for (const field of model.fields) {
      const propName = camelCase(field.name);
      let typeName = field.type;

      // Handle self-referencing types
      if (typeName === model.name) {
        typeName = model.name;
      }

      if (field.optional) {
        typeName = `${typeName}?`;
      }

      if (field.defaultValue !== undefined) {
        code += `    var ${propName}: ${typeName} = ${field.defaultValue}\n`;
      } else if (field.optional) {
        code += `    var ${propName}: ${typeName} = nil\n`;
      } else {
        code += `    var ${propName}: ${typeName}\n`;
      }
    }

    code += `}\n\n`;
  }

  return code;
}
