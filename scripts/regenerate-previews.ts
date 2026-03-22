#!/usr/bin/env npx tsx
/**
 * Regenerates all preview PNGs for the 3 example projects using the
 * preview renderer (preview-render.ts → preview.ts → Playwright).
 *
 * Outputs to examples/<project>/previews/<screen>_<sizeClass>[_<theme>].png
 *
 * Usage:  npx tsx scripts/regenerate-previews.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderPreview } from "../mcp-server/preview.js";
import { closeBrowser } from "../mcp-server/screenshot-shared.js";

const ROOT = resolve(import.meta.dirname!, "..");

interface Capture {
  screen: string;
  sizeClass: "compact" | "regular" | "expanded";
  theme?: "light" | "dark";
}

interface ProjectDef {
  name: string;
  captures: Capture[];
}

function allSizes(screen: string): Capture[] {
  return [
    { screen, sizeClass: "compact" },
    { screen, sizeClass: "expanded" },
  ];
}

function allSizesWithThemes(screen: string): Capture[] {
  return [
    { screen, sizeClass: "compact" },
    { screen, sizeClass: "expanded" },
    { screen, sizeClass: "compact", theme: "light" },
    { screen, sizeClass: "compact", theme: "dark" },
    { screen, sizeClass: "expanded", theme: "light" },
    { screen, sizeClass: "expanded", theme: "dark" },
  ];
}

const PROJECTS: ProjectDef[] = [
  {
    name: "social-app",
    captures: [
      ...allSizes("home_feed"),
      ...allSizes("discover"),
      ...allSizes("notifications"),
      ...allSizes("messages_inbox"),
      ...allSizes("profile_self"),
      ...allSizes("profile_user"),
      ...allSizes("settings"),
      ...allSizes("post_detail"),
      ...allSizes("chat_detail"),
      ...allSizes("search_results"),
      ...allSizes("edit_profile"),
    ],
  },
  {
    name: "taskflow",
    captures: [
      ...allSizesWithThemes("home"),
      ...allSizes("projects"),
      ...allSizes("calendar"),
      ...allSizesWithThemes("settings"),
      ...allSizesWithThemes("task_detail"),
      ...allSizes("project_detail"),
      ...allSizes("profile_edit"),
    ],
  },
  {
    name: "todo-orbit",
    captures: [
      ...allSizes("home"),
      ...allSizes("analytics"),
      ...allSizes("settings"),
      ...allSizes("task_detail"),
    ],
  },
];

function log(msg: string) { console.log(`\x1b[36m▸\x1b[0m ${msg}`); }
function logOk(msg: string) { console.log(`\x1b[32m✔\x1b[0m ${msg}`); }
function logErr(msg: string) { console.error(`\x1b[31m✖\x1b[0m ${msg}`); }

async function main() {
  let total = 0;
  let failures = 0;

  for (const project of PROJECTS) {
    console.log(`\n\x1b[1m=== ${project.name} ===\x1b[0m\n`);
    const projectCwd = join(ROOT, "examples", project.name);
    const outDir = join(projectCwd, "previews");
    mkdirSync(outDir, { recursive: true });

    for (const cap of project.captures) {
      const theme = cap.theme ?? "light";
      const suffix = cap.theme ? `_${cap.theme}` : "";
      const filename = `${cap.screen}_${cap.sizeClass}${suffix}.png`;
      log(`${filename}...`);
      total++;

      try {
        const result = await renderPreview(projectCwd, {
          screen: cap.screen,
          size_class: cap.sizeClass,
          theme,
        });

        for (const item of result.content) {
          if (item.type === "image" && "data" in item) {
            writeFileSync(join(outDir, filename), Buffer.from(item.data, "base64"));
            logOk(filename);
          }
        }
      } catch (err: any) {
        logErr(`${filename}: ${err.message}`);
        failures++;
      }
    }
  }

  await closeBrowser();
  console.log(`\n\x1b[${failures ? "31" : "32"}m${total - failures}/${total} previews generated, ${failures} failures\x1b[0m\n`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
