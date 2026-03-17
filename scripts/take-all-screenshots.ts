#!/usr/bin/env npx tsx
/**
 * Takes screenshots of all generated targets across all example projects.
 * Outputs to artifacts/<project>/screenshots/<platform>-<screen>.png
 *
 * Requires: puppeteer, running Android emulator, booted iOS simulator.
 */

import { spawn } from "node:child_process";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ChildProcess } from "node:child_process";

// Import helpers from mcp-server modules
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
} from "../mcp-server/screenshot-ios.js";

const exec = promisify(execCb);

const ROOT = resolve(import.meta.dirname!, "..");
const ARTIFACTS = join(ROOT, "artifacts");
const ADB_SCREENSHOT_PATH = "/sdcard/openuispec_screenshot.png";

// ── Project definitions ──────────────────────────────────────────────

interface WebScreen { name: string; route: string }
interface NativeScreen { name: string; nav?: string[] }

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
        { name: "home" },
        { name: "discover", nav: ["Discover"] },
        { name: "notifications", nav: ["Notifications"] },
        { name: "messages", nav: ["Messages"] },
        { name: "profile", nav: ["Profile"] },
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

// ── Web screenshots ──────────────────────────────────────────────────

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
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({ headless: "shell" });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      for (const screen of def.screens) {
        const fullUrl = `${url}${screen.route}`;
        log(`  web/${screen.name}: ${fullUrl}`);
        await page.goto(fullUrl, { waitUntil: "networkidle0", timeout: 15_000 });
        try {
          await page.waitForFunction(
            () => (document.getElementById("root")?.children.length ?? 0) > 0,
            { timeout: 8_000 },
          );
        } catch { /* app may not use #root */ }
        // Extra wait for images and async content to load
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

// ── Android screenshots ──────────────────────────────────────────────

async function takeAndroidScreenshots(project: string, def: NonNullable<ProjectDef["android"]>) {
  const outDir = join(ARTIFACTS, project, "screenshots");
  mkdirSync(outDir, { recursive: true });

  const androidDir = join(ROOT, def.dir);
  const adb = findAdb();
  const serial = await getConnectedEmulator(adb);

  // Free emulator storage before build/install
  log(`Cleaning emulator storage...`);
  await cleanEmulatorStorage(adb, serial);

  // Build and extract app info using shared helpers
  const appInfo = extractAndroidAppInfo(androidDir);
  log(`Building Android APK for ${project}...`);
  const apkPath = await buildApk(androidDir, appInfo.moduleName);

  // Install once
  log(`Installing on emulator ${serial}...`);
  await exec(`${adb} -s ${serial} install -r "${apkPath}"`, { timeout: 60_000 });

  for (const screen of def.screens) {
    log(`  android/${screen.name}...`);

    // Force stop and relaunch for clean state
    await adbShell(adb, serial, `am force-stop ${appInfo.applicationId}`);
    await sleep(500);
    await adbShell(adb, serial, `am start -n ${appInfo.applicationId}/${appInfo.launchActivity}`);
    await sleep(5000);

    // Navigate via shared helper
    if (screen.nav && screen.nav.length > 0) {
      try {
        await navigateByTaps(adb, serial, screen.nav);
      } catch (err: any) {
        logErr(`    Nav failed: ${err.message}`);
      }
    }

    // Capture via shared helper
    const outPath = join(outDir, `android-${screen.name}.png`);
    await captureAndroidScreenshot(adb, serial, outPath);
    logOk(`  android-${screen.name}.png`);
  }
}

// ── iOS screenshots ──────────────────────────────────────────────────

async function takeIOSScreenshots(project: string, def: NonNullable<ProjectDef["ios"]>) {
  const outDir = join(ARTIFACTS, project, "screenshots");
  mkdirSync(outDir, { recursive: true });

  const iosDir = join(ROOT, def.dir);
  const appInfo = extractIOSAppInfo(iosDir);
  const sim = findSimulator();
  const simUdid = sim.udid;

  // Build and install using shared helpers
  log(`Building iOS app for ${project} (scheme: ${appInfo.schemeName})...`);
  const appBundlePath = await buildIOSApp(iosDir, appInfo, simUdid);
  log(`Installing on simulator...`);
  await installAndLaunchIOS(simUdid, appBundlePath, appInfo.bundleId);

  // Home screen — just capture with simctl
  const homeScreen = def.screens.find((s) => !s.nav || s.nav.length === 0);
  if (homeScreen) {
    log(`  ios/${homeScreen.name} (launch screenshot)...`);
    await sleep(5000);
    await captureIOSScreenshot(simUdid, join(outDir, `ios-${homeScreen.name}.png`));
    logOk(`  ios-${homeScreen.name}.png`);
  }

  // Nav screens — batch into a single XCUITest run
  const navScreens = def.screens.filter((s) => s.nav && s.nav.length > 0);
  if (navScreens.length === 0) return;

  log(`  Generating XCUITest for ${navScreens.length} nav screens...`);

  const uitestDir = join(iosDir, ".screenshot-uitest");
  const sourcesDir = join(uitestDir, "Sources");
  mkdirSync(sourcesDir, { recursive: true });

  // Generate multi-test Swift file
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

  // Set up xcodegen project for the test target
  const UITEST_TARGET = "ScreenshotUITests";
  const hasXcodegen = existsSync(join(iosDir, "project.yml"));
  const projectYmlPath = join(iosDir, "project.yml");
  let originalProjectYml: string | null = null;
  const buildDir = join(iosDir, ".build", "screenshot");

  if (hasXcodegen) {
    originalProjectYml = readFileSync(projectYmlPath, "utf-8");
    let modifiedYml = originalProjectYml;
    if (!modifiedYml.includes("GENERATE_INFOPLIST_FILE")) {
      modifiedYml = modifiedYml.replace(
        /(PRODUCT_BUNDLE_IDENTIFIER:[^\n]+\n)/,
        "$1        GENERATE_INFOPLIST_FILE: YES\n",
      );
    }
    writeFileSync(projectYmlPath, modifiedYml + `
  ${UITEST_TARGET}:
    type: bundle.ui-testing
    platform: iOS
    deploymentTarget: "${appInfo.deploymentTarget}"
    sources:
      - path: .screenshot-uitest/Sources
    dependencies:
      - target: ${appInfo.schemeName}
        embed: false
    settings:
      base:
        PRODUCT_NAME: ${UITEST_TARGET}
        PRODUCT_MODULE_NAME: ${UITEST_TARGET}
        TEST_TARGET_NAME: ${appInfo.schemeName}
        PRODUCT_BUNDLE_IDENTIFIER: ${appInfo.bundleId}.uitests
        GENERATE_INFOPLIST_FILE: YES
`);
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

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\nTaking screenshots of all generated targets\n");

  for (const project of PROJECTS) {
    console.log(`\n\x1b[1m=== ${project.name} ===\x1b[0m\n`);

    if (project.web) {
      try { await takeWebScreenshots(project.name, project.web); }
      catch (err: any) { logErr(`Web screenshots failed for ${project.name}: ${err.message}`); }
    }

    if (project.android) {
      try { await takeAndroidScreenshots(project.name, project.android); }
      catch (err: any) { logErr(`Android screenshots failed for ${project.name}: ${err.message}`); }
    }

    if (project.ios) {
      try { await takeIOSScreenshots(project.name, project.ios); }
      catch (err: any) { logErr(`iOS screenshots failed for ${project.name}: ${err.message}`); }
    }
  }

  console.log("\n\x1b[32mDone! Screenshots saved to artifacts/\x1b[0m\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
