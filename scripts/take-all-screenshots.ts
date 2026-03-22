#!/usr/bin/env npx tsx
/**
 * Takes screenshots of all generated targets across all example projects.
 * Outputs to artifacts/<project>/screenshots/<platform>-<screen>.png
 *
 * Usage:
 *   npx tsx scripts/take-all-screenshots.ts           # per-screen mode (manual nav)
 *   npx tsx scripts/take-all-screenshots.ts --batch    # batch mode (build once, capture many)
 *
 * Requires: playwright, running Android emulator, booted iOS simulator.
 */

import { spawn } from "node:child_process";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ChildProcess } from "node:child_process";

// Import helpers from mcp-server modules (per-screen mode)
import {
  findAdb,
  getConnectedEmulator,
  adbShell,
  extractAppInfo as extractAndroidAppInfo,
  buildApk,
  navigateByTaps,
  captureScreenshot as captureAndroidScreenshot,
  cleanEmulatorStorage,
} from "../mcp-server/screenshot-android.js";
import {
  type IOSAppInfo,
  extractAppInfo as extractIOSAppInfo,
  findSimulator,
  buildApp as buildIOSApp,
  findAppBundle,
  installAndLaunch as installAndLaunchIOS,
  captureScreenshot as captureIOSScreenshot,
  generateUITestTargetYml,
  insertUITestTarget,
  ensureInfoPlistFlag,
} from "../mcp-server/screenshot-ios.js";

// Import batch functions
import { takeScreenshotBatch } from "../mcp-server/screenshot.js";
import { takeAndroidScreenshotBatch } from "../mcp-server/screenshot-android.js";
import { takeIOSScreenshotBatch } from "../mcp-server/screenshot-ios.js";

const exec = promisify(execCb);

const ROOT = resolve(import.meta.dirname!, "..");
const ARTIFACTS = join(ROOT, "artifacts");
const BATCH_MODE = process.argv.includes("--batch");
const PLATFORM_FILTER = (() => {
  const idx = process.argv.indexOf("--platform");
  return idx >= 0 ? process.argv[idx + 1]?.toLowerCase() : null;
})();

// ── Project definitions ──────────────────────────────────────────────

interface WebScreen { name: string; route: string }
interface NativeScreen { name: string; route?: string; nav?: string[] }

interface ProjectDef {
  name: string;
  web?: { dir: string; screens: WebScreen[] };
  android?: { dir: string; screens: NativeScreen[] };
  ios?: { dir: string; screens: NativeScreen[] };
}

const PROJECTS: ProjectDef[] = [
  {
    name: "social-app",
    web: {
      dir: "examples/social-app/generated/web/social-app",
      screens: [
        { name: "home", route: "/home" },
        { name: "discover", route: "/discover" },
        { name: "notifications", route: "/notifications" },
        { name: "messages", route: "/messages" },
        { name: "profile", route: "/profile" },
        { name: "settings", route: "/settings" },
      ],
    },
    android: {
      dir: "examples/social-app/generated/android/social-app",
      screens: [
        { name: "home", route: "socialapp://home" },
        { name: "discover", route: "socialapp://discover" },
        { name: "notifications", route: "socialapp://notifications" },
        { name: "messages", route: "socialapp://messages" },
        { name: "profile", route: "socialapp://profile" },
      ],
    },
  },
  {
    name: "todo-orbit",
    web: {
      dir: "examples/todo-orbit/generated/web/Todo Orbit",
      screens: [
        { name: "home", route: "/" },
        { name: "analytics", route: "/analytics" },
        { name: "settings", route: "/settings" },
      ],
    },
    android: {
      dir: "examples/todo-orbit/generated/android/Todo Orbit",
      screens: [
        { name: "home" },
        { name: "analytics", nav: ["Analytics"] },
        { name: "settings", nav: ["Settings"] },
      ],
    },
    ios: {
      dir: "examples/todo-orbit/generated/ios/Todo Orbit",
      screens: [
        { name: "home" },
        { name: "analytics", nav: ["Analytics"] },
        { name: "settings", nav: ["Settings"] },
      ],
    },
  },
  {
    name: "taskflow",
    web: {
      dir: "examples/taskflow/generated/web/TaskFlow",
      screens: [
        { name: "home", route: "/tasks" },
        { name: "projects", route: "/projects" },
        { name: "calendar", route: "/calendar" },
        { name: "settings", route: "/settings" },
        { name: "profile", route: "/profile" },
      ],
    },
    android: {
      dir: "examples/taskflow/generated/android/TaskFlow",
      screens: [
        { name: "home" },
        { name: "projects", nav: ["Projects"] },
        { name: "settings", nav: ["Settings"] },
      ],
    },
    ios: {
      dir: "examples/taskflow/generated/ios/TaskFlow",
      screens: [
        { name: "home" },
        { name: "projects", nav: ["Projects"] },
        { name: "calendar", nav: ["Calendar"] },
        { name: "settings", nav: ["Settings"] },
      ],
    },
  },
];

// ── Utilities ────────────────────────────────────────────────────────

function log(msg: string) { console.log(`\x1b[36m▸\x1b[0m ${msg}`); }
function logOk(msg: string) { console.log(`\x1b[32m✔\x1b[0m ${msg}`); }
function logErr(msg: string) { console.error(`\x1b[31m✖\x1b[0m ${msg}`); }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function saveResultScreenshots(result: any, outDir: string, platform: string) {
  mkdirSync(outDir, { recursive: true });
  if (result.isError) {
    logErr(`  ${platform}: ${result.content?.[0]?.text ?? "unknown error"}`);
    return;
  }
  for (const item of result.content) {
    if (item.type === "image" && item.data) {
      // Next text item has metadata with screen name
      const idx = result.content.indexOf(item);
      const meta = result.content[idx + 1];
      let screenName = "unknown";
      if (meta?.type === "text") {
        try { screenName = JSON.parse(meta.text).screen; } catch { /* ignore */ }
      }
      const outPath = join(outDir, `${platform}-${screenName}.png`);
      writeFileSync(outPath, Buffer.from(item.data, "base64"));
      logOk(`  ${platform}-${screenName}.png`);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// BATCH MODE — uses takeScreenshotBatch / takeAndroidScreenshotBatch / takeIOSScreenshotBatch
// ══════════════════════════════════════════════════════════════════════

async function runBatchMode() {
  for (const project of PROJECTS) {
    console.log(`\n\x1b[1m=== ${project.name} (batch) ===\x1b[0m\n`);
    const outDir = join(ARTIFACTS, project.name, "screenshots");

    if (project.ios && (!PLATFORM_FILTER || PLATFORM_FILTER === "ios")) {
      try {
        log(`iOS batch: ${project.ios.screens.length} screens...`);
        const result = await takeIOSScreenshotBatch(join(ROOT, "examples", project.name), {
          captures: project.ios.screens.map((s) => ({ screen: s.name, nav: s.nav, wait_for: 5000 })),
          project_dir: join(ROOT, project.ios.dir),
        });
        saveResultScreenshots(result, outDir, "ios");
      } catch (err: any) { logErr(`iOS batch failed for ${project.name}: ${err.message}`); }
    }

    if (project.android && (!PLATFORM_FILTER || PLATFORM_FILTER === "android")) {
      try {
        log(`Android batch: ${project.android.screens.length} screens...`);
        const result = await takeAndroidScreenshotBatch(join(ROOT, "examples", project.name), {
          captures: project.android.screens.map((s) => ({ screen: s.name, route: s.route, nav: s.nav, wait_for: 8000 })),
          project_dir: join(ROOT, project.android.dir),
        });
        saveResultScreenshots(result, outDir, "android");
      } catch (err: any) { logErr(`Android batch failed for ${project.name}: ${err.message}`); }
    }

    if (project.web && (!PLATFORM_FILTER || PLATFORM_FILTER === "web")) {
      try {
        const openuispecDir = join(ROOT, "examples", project.name);
        log(`Web batch: ${project.web.screens.length} screens...`);
        const result = await takeScreenshotBatch(openuispecDir, {
          captures: project.web.screens.map((s) => ({ screen: s.name, route: s.route, wait_for: 3000 })),
        });
        saveResultScreenshots(result, outDir, "web");
      } catch (err: any) { logErr(`Web batch failed for ${project.name}: ${err.message}`); }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// PER-SCREEN MODE — manual vite + playwright for web, adb for android, simctl + XCUITest for iOS
// ══════════════════════════════════════════════════════════════════════

async function startViteServer(dir: string): Promise<{ proc: ChildProcess; url: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("npx", ["vite", "--port", "0"], {
      cwd: dir,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, BROWSER: "none" },
    });

    let output = "";
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error(`Vite server timed out. Output: ${output}`));
    }, 30_000);

    const onData = (data: Buffer) => {
      output += data.toString();
      const match = output.match(/Local:\s+(https?:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        proc.stdout?.removeListener("data", onData);
        proc.stderr?.removeListener("data", onData);
        resolve({ proc, url: match[1].replace(/\/+$/, "") });
      }
    };

    proc.stdout?.on("data", onData);
    proc.stderr?.on("data", onData);
    proc.on("error", (err) => { clearTimeout(timeout); reject(err); });
  });
}

async function takeWebScreenshots(project: string, def: NonNullable<ProjectDef["web"]>) {
  const outDir = join(ARTIFACTS, project, "screenshots");
  mkdirSync(outDir, { recursive: true });

  log(`Starting web server for ${project}...`);
  const { proc, url } = await startViteServer(join(ROOT, def.dir));

  try {
    const playwright = await import("playwright");
    const browser = await playwright.chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      for (const screen of def.screens) {
        const fullUrl = `${url}${screen.route}`;
        log(`  web/${screen.name}: ${fullUrl}`);
        await page.goto(fullUrl, { waitUntil: "networkidle", timeout: 15_000 });
        try {
          await page.waitForFunction(
            () => (document.getElementById("root")?.children.length ?? 0) > 0,
            { timeout: 8_000 },
          );
        } catch { /* app may not use #root */ }
        await sleep(3000);
        await page.screenshot({ path: join(outDir, `web-${screen.name}.png`), fullPage: false });
        logOk(`  web-${screen.name}.png`);
      }
    } finally {
      await browser.close();
    }
  } finally {
    proc.kill();
  }
}

async function takeAndroidScreenshots(project: string, def: NonNullable<ProjectDef["android"]>) {
  const outDir = join(ARTIFACTS, project, "screenshots");
  mkdirSync(outDir, { recursive: true });

  const androidDir = join(ROOT, def.dir);
  const adb = findAdb();
  const serial = await getConnectedEmulator(adb);

  log(`Cleaning emulator storage...`);
  await cleanEmulatorStorage(adb, serial);

  const appInfo = extractAndroidAppInfo(androidDir);
  log(`Building Android APK for ${project}...`);
  const apkPath = await buildApk(androidDir, appInfo.moduleName);

  log(`Installing on emulator ${serial}...`);
  await exec(`${adb} -s ${serial} install -r "${apkPath}"`, { timeout: 60_000 });

  for (const screen of def.screens) {
    log(`  android/${screen.name}...`);

    await adbShell(adb, serial, `am force-stop ${appInfo.applicationId}`);
    try { await adbShell(adb, serial, `pm clear ${appInfo.applicationId}`); } catch { /* ignore */ }
    await sleep(500);

    if (screen.route) {
      // Deep link launch
      await adbShell(adb, serial,
        `am start -W -a android.intent.action.VIEW -d '${screen.route}' ` +
        `${appInfo.applicationId}/${appInfo.launchActivity}`);
    } else {
      // Normal launch + optional nav taps
      await adbShell(adb, serial,
        `am start -W -n ${appInfo.applicationId}/${appInfo.launchActivity}`);
    }
    await sleep(5000);

    if (!screen.route && screen.nav && screen.nav.length > 0) {
      try {
        await navigateByTaps(adb, serial, screen.nav);
      } catch (err: any) {
        logErr(`    Nav failed: ${err.message}`);
      }
    }

    const outPath = join(outDir, `android-${screen.name}.png`);
    await captureAndroidScreenshot(adb, serial, outPath);
    logOk(`  android-${screen.name}.png`);
  }
}

async function takeIOSScreenshots(project: string, def: NonNullable<ProjectDef["ios"]>) {
  const outDir = join(ARTIFACTS, project, "screenshots");
  mkdirSync(outDir, { recursive: true });

  const iosDir = join(ROOT, def.dir);
  const appInfo = extractIOSAppInfo(iosDir);
  const sim = findSimulator();
  const simUdid = sim.udid;

  log(`Building iOS app for ${project} (scheme: ${appInfo.schemeName})...`);
  const appBundlePath = await buildIOSApp(iosDir, appInfo, simUdid);
  log(`Installing on simulator...`);
  await installAndLaunchIOS(simUdid, appBundlePath, appInfo.bundleId);

  const homeScreen = def.screens.find((s) => !s.nav || s.nav.length === 0);
  if (homeScreen) {
    log(`  ios/${homeScreen.name} (launch screenshot)...`);
    await sleep(5000);
    await captureIOSScreenshot(simUdid, join(outDir, `ios-${homeScreen.name}.png`));
    logOk(`  ios-${homeScreen.name}.png`);
  }

  const navScreens = def.screens.filter((s) => s.nav && s.nav.length > 0);
  if (navScreens.length === 0) return;

  log(`  Generating XCUITest for ${navScreens.length} nav screens...`);

  const uitestDir = join(iosDir, ".screenshot-uitest");
  const sourcesDir = join(uitestDir, "Sources");
  mkdirSync(sourcesDir, { recursive: true });

  const testCases = navScreens.map((screen, i) => {
    const taps = (screen.nav ?? []).map((step, j) => {
      const escaped = step.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `
        let target_${i}_${j} = app.descendants(matching: .any).matching(NSPredicate(format: "label ==[c] %@ OR title ==[c] %@", "${escaped}", "${escaped}")).firstMatch
        if target_${i}_${j}.waitForExistence(timeout: 5) {
            target_${i}_${j}.tap()
            Thread.sleep(forTimeInterval: 0.8)
        }`;
    }).join("\n");

    const outputPath = join(outDir, `ios-${screen.name}.png`).replace(/"/g, '\\"');
    return `
    func test_${String(i + 1).padStart(2, "0")}_${screen.name}() {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)"]
        app.launch()
        Thread.sleep(forTimeInterval: 2.0)
${taps}
        Thread.sleep(forTimeInterval: 0.5)
        let screenshot = XCUIScreen.main.screenshot()
        try! screenshot.pngRepresentation.write(to: URL(fileURLWithPath: "${outputPath}"))
    }`;
  }).join("\n");

  writeFileSync(join(sourcesDir, "ScreenshotUITest.swift"),
    `import XCTest\n\nfinal class ScreenshotUITest: XCTestCase {\n${testCases}\n}\n`);

  const UITEST_TARGET = "ScreenshotUITests";
  const hasXcodegen = existsSync(join(iosDir, "project.yml"));
  const projectYmlPath = join(iosDir, "project.yml");
  let originalProjectYml: string | null = null;
  const buildDir = join(iosDir, ".build", "screenshot");

  if (hasXcodegen) {
    originalProjectYml = readFileSync(projectYmlPath, "utf-8");
    let modifiedYml = ensureInfoPlistFlag(originalProjectYml);
    modifiedYml = insertUITestTarget(modifiedYml, generateUITestTargetYml(appInfo, ".screenshot-uitest/Sources", true));
    writeFileSync(projectYmlPath, modifiedYml);
    await exec(`xcodegen generate`, { cwd: iosDir, timeout: 30_000 });
  } else {
    writeFileSync(join(uitestDir, "project.yml"), `name: ${UITEST_TARGET}
targets:
  ${UITEST_TARGET}:
    type: bundle.ui-testing
    platform: iOS
    deploymentTarget: "${appInfo.deploymentTarget}"
    sources:
      - path: Sources
    settings:
      base:
        TEST_TARGET_NAME: ${appInfo.schemeName}
        PRODUCT_BUNDLE_IDENTIFIER: ${appInfo.bundleId}.uitests
        GENERATE_INFOPLIST_FILE: YES
`);
    await exec(`xcodegen generate`, { cwd: uitestDir, timeout: 30_000 });
  }

  const testProjectFlag = hasXcodegen
    ? (appInfo.xcodeproj ? `-project "${join(iosDir, appInfo.xcodeproj)}"` : "")
    : `-project "${join(uitestDir, `${UITEST_TARGET}.xcodeproj`)}"`;
  const testCwd = hasXcodegen ? iosDir : uitestDir;

  try {
    log(`  Running XCUITest to capture ${navScreens.length} screens...`);
    await exec(
      `xcodebuild test ${testProjectFlag} -scheme "${UITEST_TARGET}" -destination "id=${simUdid}" -derivedDataPath "${buildDir}" -only-testing:${UITEST_TARGET}/ScreenshotUITest 2>&1`,
      { cwd: testCwd, timeout: 300_000 },
    );
  } catch {
    const missing = navScreens.filter((s) => !existsSync(join(outDir, `ios-${s.name}.png`)));
    if (missing.length > 0) {
      logErr(`  XCUITest failed for: ${missing.map((s) => s.name).join(", ")}`);
    }
  } finally {
    if (originalProjectYml) {
      writeFileSync(projectYmlPath, originalProjectYml);
      try { await exec(`xcodegen generate`, { cwd: iosDir, timeout: 30_000 }); } catch { /* best effort */ }
    }
  }

  for (const screen of navScreens) {
    if (existsSync(join(outDir, `ios-${screen.name}.png`))) {
      logOk(`  ios-${screen.name}.png`);
    }
  }
}

async function runPerScreenMode() {
  for (const project of PROJECTS) {
    console.log(`\n\x1b[1m=== ${project.name} ===\x1b[0m\n`);

    if (project.ios && (!PLATFORM_FILTER || PLATFORM_FILTER === "ios")) {
      try { await takeIOSScreenshots(project.name, project.ios); }
      catch (err: any) { logErr(`iOS screenshots failed for ${project.name}: ${err.message}`); }
    }

    if (project.android && (!PLATFORM_FILTER || PLATFORM_FILTER === "android")) {
      try { await takeAndroidScreenshots(project.name, project.android); }
      catch (err: any) { logErr(`Android screenshots failed for ${project.name}: ${err.message}`); }
    }

    if (project.web && (!PLATFORM_FILTER || PLATFORM_FILTER === "web")) {
      try { await takeWebScreenshots(project.name, project.web); }
      catch (err: any) { logErr(`Web screenshots failed for ${project.name}: ${err.message}`); }
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const mode = BATCH_MODE ? "batch" : "per-screen";
  console.log(`\nTaking screenshots of all generated targets (${mode} mode)\n`);

  if (BATCH_MODE) {
    await runBatchMode();
  } else {
    await runPerScreenMode();
  }

  console.log("\n\x1b[32mDone! Screenshots saved to artifacts/\x1b[0m\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
