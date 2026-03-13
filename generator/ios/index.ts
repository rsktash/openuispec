#!/usr/bin/env tsx
/**
 * OpenUISpec → SwiftUI Generator
 *
 * Reads the TaskFlow example's YAML/JSON spec files and outputs
 * a compilable Swift Package with a SwiftUI app.
 *
 * Usage:
 *   npm run generate:ios
 *   npx tsx generator/ios/index.ts
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseProject } from "./parse/parser.js";
import { transform } from "./ir/transform.js";
import { writeFiles, type GeneratedFile } from "./write.js";

// Codegen emitters
import { emitPackageSwift } from "./codegen/emit-package.js";
import {
  emitColorTokens,
  emitTypographyTokens,
  emitSpacingTokens,
  emitElevationTokens,
  emitMotionTokens,
  emitAppTheme,
} from "./codegen/emit-tokens.js";
import { emitModels } from "./codegen/emit-models.js";
import { emitServiceProtocol, emitMockService } from "./codegen/emit-mock.js";
import { emitLocalizableStrings, emitL10nHelper } from "./codegen/emit-l10n.js";
import {
  emitActionTriggerView,
  emitDataDisplayView,
  emitInputFieldView,
  emitCollectionView,
  emitFeedbackView,
  emitSurfaceView,
} from "./codegen/emit-contracts.js";
import {
  emitHomeScreen,
  emitTaskDetailScreen,
  emitProjectsScreen,
  emitSettingsScreen,
  emitCalendarScreen,
  emitProjectDetailScreen,
  emitProfileEditScreen,
} from "./codegen/emit-screens.js";
import { emitCreateTaskFlow, emitEditTaskFlow } from "./codegen/emit-flows.js";
import { emitAppEntry, emitRouter, emitRoute, emitColorHex } from "./codegen/emit-app.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_DIR = resolve(__dirname, "..", "..", "examples", "taskflow");
const OUTPUT_DIR = resolve(__dirname, "..", "..", "generated", "ios", "TaskFlow");

function main(): void {
  console.log("OpenUISpec → SwiftUI Generator");
  console.log("==============================\n");

  // Phase 1: Parse
  console.log("Phase 1: Parsing spec files...");
  const project = parseProject(PROJECT_DIR);
  console.log(`  Project: ${project.manifest.project.name}`);
  console.log(`  Screens: ${Object.keys(project.screens).join(", ")}`);
  console.log(`  Flows: ${Object.keys(project.flows).join(", ")}`);

  // Phase 2: Transform to IR
  console.log("\nPhase 2: Transforming to IR...");
  const ir = transform(project);
  console.log(`  Colors: ${ir.colors.length}`);
  console.log(`  Typography: ${ir.typography.length}`);
  console.log(`  Icons: ${ir.icons.length}`);
  console.log(`  Models: ${ir.models.map((m) => m.name).join(", ")}`);
  console.log(`  L10n keys: ${Object.keys(ir.localeStrings).length}`);

  // Phase 3: Code generation
  console.log("\nPhase 3: Generating Swift code...");
  const files: GeneratedFile[] = [];

  // Package.swift
  files.push({ path: "Package.swift", content: emitPackageSwift(ir) });

  // Theme
  files.push({ path: "Sources/Theme/Color+Tokens.swift", content: emitColorTokens(ir) });
  files.push({ path: "Sources/Theme/Typography+Tokens.swift", content: emitTypographyTokens(ir) });
  files.push({ path: "Sources/Theme/Spacing+Tokens.swift", content: emitSpacingTokens(ir) });
  files.push({ path: "Sources/Theme/Elevation+Tokens.swift", content: emitElevationTokens(ir) });
  files.push({ path: "Sources/Theme/Motion+Tokens.swift", content: emitMotionTokens() });
  files.push({ path: "Sources/Theme/AppTheme.swift", content: emitAppTheme() });

  // Models
  files.push({ path: "Sources/Models/Models.swift", content: emitModels(ir) });

  // Services
  files.push({ path: "Sources/Services/TaskFlowService.swift", content: emitServiceProtocol(ir) });
  files.push({ path: "Sources/Services/MockService.swift", content: emitMockService(ir) });

  // Localization
  files.push({ path: "Sources/Resources/Localizable.strings", content: emitLocalizableStrings(ir.localeStrings) });
  files.push({ path: "Sources/Localization/L10n.swift", content: emitL10nHelper(ir.localeStrings) });

  // Components (contract views)
  files.push({ path: "Sources/Components/ActionTriggerView.swift", content: emitActionTriggerView() });
  files.push({ path: "Sources/Components/DataDisplayView.swift", content: emitDataDisplayView() });
  files.push({ path: "Sources/Components/InputFieldView.swift", content: emitInputFieldView() });
  files.push({ path: "Sources/Components/CollectionView.swift", content: emitCollectionView() });
  files.push({ path: "Sources/Components/FeedbackView.swift", content: emitFeedbackView() });
  files.push({ path: "Sources/Components/SurfaceView.swift", content: emitSurfaceView() });

  // Screens
  files.push({ path: "Sources/Screens/HomeScreen.swift", content: emitHomeScreen(ir.icons) });
  files.push({ path: "Sources/Screens/TaskDetailScreen.swift", content: emitTaskDetailScreen(ir.icons) });
  files.push({ path: "Sources/Screens/ProjectsScreen.swift", content: emitProjectsScreen(ir.icons) });
  files.push({ path: "Sources/Screens/SettingsScreen.swift", content: emitSettingsScreen(ir.icons) });
  files.push({ path: "Sources/Screens/CalendarScreen.swift", content: emitCalendarScreen() });
  files.push({ path: "Sources/Screens/ProjectDetailScreen.swift", content: emitProjectDetailScreen(ir.icons) });
  files.push({ path: "Sources/Screens/ProfileEditScreen.swift", content: emitProfileEditScreen(ir.icons) });

  // Flows
  files.push({ path: "Sources/Flows/CreateTaskFlow.swift", content: emitCreateTaskFlow(ir.icons) });
  files.push({ path: "Sources/Flows/EditTaskFlow.swift", content: emitEditTaskFlow(ir.icons) });

  // Navigation
  files.push({ path: "Sources/Navigation/AppRouter.swift", content: emitRouter() });
  files.push({ path: "Sources/Navigation/Route.swift", content: emitRoute() });

  // Utilities
  files.push({ path: "Sources/Utilities/Color+Hex.swift", content: emitColorHex() });

  // App entry point
  files.push({ path: "Sources/TaskFlowApp.swift", content: emitAppEntry(ir) });

  // Write
  console.log(`\nWriting ${files.length} files to ${OUTPUT_DIR}...`);
  writeFiles(OUTPUT_DIR, files);

  console.log("\nDone! Generated Swift package at:");
  console.log(`  ${OUTPUT_DIR}`);
  console.log("\nTo build:");
  console.log(`  cd ${OUTPUT_DIR} && swift build`);
}

main();
