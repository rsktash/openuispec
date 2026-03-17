/**
 * iOS screenshot tool — builds the app, installs on a simulator,
 * and captures real screenshots via xcrun simctl or XCUITest.
 *
 * When `nav` steps are provided, generates an XCUITest that taps elements
 * by accessibility label and captures with XCUIScreen.main.screenshot().
 * Without `nav`, uses xcrun simctl io screenshot directly.
 *
 * Requires Xcode and an iOS Simulator runtime.
 */

import { exec as execCb, execSync } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, readdirSync, mkdirSync, copyFileSync, unlinkSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  type ScreenshotResult,
  findPlatformAppDir,
  buildScreenshotResponse,
} from "./screenshot-shared.js";

const exec = promisify(execCb);

// ── types ───────────────────────────────────────────────────────────

export interface IOSScreenshotOptions {
  screen?: string;
  device?: string;
  nav?: string[];
  theme?: "light" | "dark";
  wait_for?: number;
  output_dir?: string;
  project_dir?: string;
  scheme?: string;
  bundle_id?: string;
}

// ── iOS app directory discovery ─────────────────────────────────────

function hasXcodeProject(dir: string): boolean {
  try {
    return readdirSync(dir).some(
      (e) => e.endsWith(".xcodeproj") || e.endsWith(".xcworkspace") || e === "Package.swift",
    );
  } catch {
    return false;
  }
}

export function findIOSAppDir(projectCwd: string, directDir?: string): string {
  return findPlatformAppDir(projectCwd, "ios", hasXcodeProject, directDir);
}

// ── Xcode project info extraction ───────────────────────────────────

export interface IOSAppInfo {
  projectName: string;
  schemeName: string;
  bundleId: string;
  xcodeproj: string | null;
  xcworkspace: string | null;
  hasXcodegen: boolean;
  deploymentTarget: string;
}

function extractDeploymentTarget(pbxprojContent: string): string | null {
  const match = pbxprojContent.match(/IPHONEOS_DEPLOYMENT_TARGET\s*=\s*"?([0-9.]+)"?/);
  return match ? match[1] : null;
}

export function extractAppInfo(
  iosDir: string,
  overrides?: { scheme?: string; bundle_id?: string },
): IOSAppInfo {
  const entries = readdirSync(iosDir);
  const xcodeproj = entries.find((e) => e.endsWith(".xcodeproj")) ?? null;
  const xcworkspace = entries.find((e) => e.endsWith(".xcworkspace")) ?? null;
  const hasXcodegen = entries.includes("project.yml");
  const projectName = xcodeproj?.replace(".xcodeproj", "") ??
    xcworkspace?.replace(".xcworkspace", "") ?? "App";

  let schemeName = overrides?.scheme ?? projectName;
  let bundleId = overrides?.bundle_id ??
    `com.example.${projectName.toLowerCase().replace(/\s+/g, "")}`;
  let deploymentTarget = "17.0";

  if (xcodeproj) {
    const pbxprojPath = join(iosDir, xcodeproj, "project.pbxproj");
    try {
      const content = readFileSync(pbxprojPath, "utf-8");
      if (!overrides?.bundle_id) {
        const bundleMatch = content.match(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*"?([^";]+)/);
        if (bundleMatch) bundleId = bundleMatch[1];
      }
      const detectedTarget = extractDeploymentTarget(content);
      if (detectedTarget) deploymentTarget = detectedTarget;
    } catch { /* use defaults */ }

    if (!overrides?.scheme) {
      const schemesDir = join(iosDir, xcodeproj, "xcshareddata", "xcschemes");
      try {
        const schemes = readdirSync(schemesDir).filter(f => f.endsWith(".xcscheme"));
        if (schemes.length > 0) schemeName = schemes[0].replace(".xcscheme", "");
      } catch { /* use project name */ }
    }
  }

  return { projectName, schemeName, bundleId, xcodeproj, xcworkspace, hasXcodegen, deploymentTarget };
}

// ── simulator helpers ───────────────────────────────────────────────

export interface SimDevice {
  name: string;
  udid: string;
  state: string;
}

export function findSimulator(deviceName?: string): SimDevice {
  let output: string;
  try {
    output = execSync("xcrun simctl list devices available -j", { stdio: "pipe", encoding: "utf-8" });
  } catch {
    throw new Error("Failed to list simulators. Ensure Xcode is installed.");
  }

  const data = JSON.parse(output);
  const devices: Record<string, SimDevice[]> = data.devices;

  if (deviceName) {
    const shortName = deviceName.replace(/ \(.*\)/, "");
    for (const [runtime, devicesInRuntime] of Object.entries(devices)) {
      if (!runtime.includes("iOS")) continue;
      for (const device of devicesInRuntime) {
        if (device.name === deviceName || device.name.includes(shortName)) {
          return device;
        }
      }
    }
    throw new Error(
      `No simulator found matching "${deviceName}". Run 'xcrun simctl list devices available' to see options.`,
    );
  }

  // Default: find any booted iPhone, or first available iPhone
  let firstIphone: SimDevice | null = null;
  for (const [runtime, devicesInRuntime] of Object.entries(devices)) {
    if (!runtime.includes("iOS")) continue;
    for (const device of devicesInRuntime) {
      if (!device.name.includes("iPhone") && !device.name.includes("iPad")) continue;
      if (device.state === "Booted") return device;
      if (!firstIphone && device.name.includes("iPhone")) firstIphone = device;
    }
  }

  if (firstIphone) return firstIphone;
  throw new Error("No iOS Simulator found. Install a simulator runtime via Xcode.");
}

export async function ensureSimulatorBooted(udid: string): Promise<void> {
  try {
    await exec(`xcrun simctl boot ${udid}`);
    await new Promise(r => setTimeout(r, 3000));
  } catch (err: any) {
    if (!err.stderr?.includes("Booted")) throw err;
  }
}

// ── build app ───────────────────────────────────────────────────────

export async function buildApp(iosDir: string, appInfo: IOSAppInfo, simulatorUdid: string): Promise<string> {
  const buildDir = join(iosDir, ".build", "screenshot");
  mkdirSync(buildDir, { recursive: true });

  const projectFlag = appInfo.xcworkspace
    ? `-workspace "${join(iosDir, appInfo.xcworkspace)}"`
    : appInfo.xcodeproj
    ? `-project "${join(iosDir, appInfo.xcodeproj)}"`
    : "";

  try {
    await exec(
      `xcodebuild build ` +
      `${projectFlag} ` +
      `-scheme "${appInfo.schemeName}" ` +
      `-destination "id=${simulatorUdid}" ` +
      `-derivedDataPath "${buildDir}" ` +
      `-quiet 2>&1`,
      { cwd: iosDir, timeout: 300_000 },
    );
  } catch (err: any) {
    const output = ((err.stderr ?? "") + "\n" + (err.stdout ?? "")).slice(-500);
    throw new Error(`Xcode build failed:\n${output}`);
  }

  const productsDir = join(buildDir, "Build", "Products");
  const appBundle = findAppBundle(productsDir);
  if (!appBundle) throw new Error("App bundle (.app) not found after build.");
  return appBundle;
}

export function findAppBundle(dir: string): string | null {
  if (!existsSync(dir)) return null;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (entry.endsWith(".app")) return fullPath;
    try {
      if (statSync(fullPath).isDirectory()) {
        const found = findAppBundle(fullPath);
        if (found) return found;
      }
    } catch { /* skip */ }
  }
  return null;
}

// ── install & launch ────────────────────────────────────────────────

export async function installAndLaunch(udid: string, appBundlePath: string, bundleId: string): Promise<void> {
  await exec(`xcrun simctl install ${udid} "${appBundlePath}"`, { timeout: 60_000 });
  try { await exec(`xcrun simctl terminate ${udid} ${bundleId}`); } catch { /* not running */ }
  await exec(`xcrun simctl launch ${udid} ${bundleId}`, { timeout: 30_000 });
}

// ── theme control ───────────────────────────────────────────────────

async function setAppearance(udid: string, theme: "light" | "dark"): Promise<void> {
  await exec(`xcrun simctl ui ${udid} appearance ${theme}`);
}

// ── XCUITest-based navigation + screenshot ──────────────────────────

const UITEST_TARGET = "ScreenshotUITests";
const UITEST_DIR = ".screenshot-uitest";

function generateUITestSwift(
  bundleId: string,
  navSteps: string[],
  waitMs: number,
  outputPath: string,
): string {
  const taps = navSteps.map((step, i) => {
    const escaped = step.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `
        // Tap "${escaped}"
        let target_${i} = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@ OR title == %@", "${escaped}", "${escaped}")).firstMatch
        if target_${i}.waitForExistence(timeout: 5) {
            target_${i}.tap()
            Thread.sleep(forTimeInterval: 0.8)
        }`;
  }).join("\n");

  return `import XCTest

final class ScreenshotUITest: XCTestCase {
    func testNavigateAndScreenshot() {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)"]
        app.launch()

        // Wait for app to load
        Thread.sleep(forTimeInterval: ${(waitMs / 1000).toFixed(1)})
${taps}

        // Wait for navigation to settle
        Thread.sleep(forTimeInterval: 0.5)

        // Capture screenshot
        let screenshot = XCUIScreen.main.screenshot()
        let pngData = screenshot.pngRepresentation
        let outputPath = "${outputPath.replace(/"/g, '\\"')}"
        try! pngData.write(to: URL(fileURLWithPath: outputPath))
    }
}
`;
}

function generateXcodegenConfig(
  appInfo: IOSAppInfo,
  testSourcesDir: string,
): string {
  return `name: ${UITEST_TARGET}
targets:
  ${UITEST_TARGET}:
    type: bundle.ui-testing
    platform: iOS
    deploymentTarget: "${appInfo.deploymentTarget}"
    sources:
      - path: ${testSourcesDir}
    dependencies:
      - target: ${appInfo.schemeName}
        embed: false
    settings:
      base:
        TEST_TARGET_NAME: ${appInfo.schemeName}
        PRODUCT_BUNDLE_IDENTIFIER: ${appInfo.bundleId}.uitests
        GENERATE_INFOPLIST_FILE: YES
`;
}

async function runXCUITest(
  iosDir: string,
  appInfo: IOSAppInfo,
  simulatorUdid: string,
  navSteps: string[],
  waitMs: number,
  screenshotOutputPath: string,
): Promise<void> {
  const uitestDir = join(iosDir, UITEST_DIR);
  const sourcesDir = join(uitestDir, "Sources");
  mkdirSync(sourcesDir, { recursive: true });

  // Generate the UI test Swift file
  const testSwift = generateUITestSwift(appInfo.bundleId, navSteps, waitMs, screenshotOutputPath);
  writeFileSync(join(sourcesDir, "ScreenshotUITest.swift"), testSwift);

  // For xcodegen projects: add UI test target to project.yml temporarily
  // For non-xcodegen projects: generate a standalone XCUITest xcode project in .screenshot-uitest/
  const projectYmlPath = join(iosDir, "project.yml");
  let originalProjectYml: string | null = null;
  let standaloneProjectDir: string | null = null;

  if (appInfo.hasXcodegen) {
    originalProjectYml = readFileSync(projectYmlPath, "utf-8");

    // Ensure main target has GENERATE_INFOPLIST_FILE and append UI test target
    let modifiedYml = originalProjectYml;
    if (!modifiedYml.includes("GENERATE_INFOPLIST_FILE")) {
      // Add after the first PRODUCT_BUNDLE_IDENTIFIER line
      modifiedYml = modifiedYml.replace(
        /(PRODUCT_BUNDLE_IDENTIFIER:[^\n]+\n)/,
        "$1        GENERATE_INFOPLIST_FILE: YES\n",
      );
    }

    const uitestConfig = `
  ${UITEST_TARGET}:
    type: bundle.ui-testing
    platform: iOS
    deploymentTarget: "${appInfo.deploymentTarget}"
    sources:
      - path: ${UITEST_DIR}/Sources
    dependencies:
      - target: ${appInfo.schemeName}
        embed: false
    settings:
      base:
        TEST_TARGET_NAME: ${appInfo.schemeName}
        PRODUCT_BUNDLE_IDENTIFIER: ${appInfo.bundleId}.uitests
        GENERATE_INFOPLIST_FILE: YES
`;
    writeFileSync(projectYmlPath, modifiedYml + uitestConfig);

    // Regenerate Xcode project
    try {
      await exec(`xcodegen generate`, { cwd: iosDir, timeout: 30_000 });
    } catch (err: any) {
      // Restore original project.yml
      writeFileSync(projectYmlPath, originalProjectYml);
      throw new Error(`xcodegen failed: ${((err.stderr ?? "") + (err.stdout ?? "")).slice(-300)}`);
    }
  } else {
    // Non-xcodegen project: create a standalone XCUITest project in .screenshot-uitest/
    standaloneProjectDir = uitestDir;
    const standaloneYml = `name: ${UITEST_TARGET}
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
`;
    writeFileSync(join(uitestDir, "project.yml"), standaloneYml);

    try {
      await exec(`xcodegen generate`, { cwd: uitestDir, timeout: 30_000 });
    } catch (err: any) {
      throw new Error(`xcodegen failed for standalone UI test project: ${((err.stderr ?? "") + (err.stdout ?? "")).slice(-300)}`);
    }
  }

  const buildDir = join(iosDir, ".build", "screenshot");
  let projectFlag: string;
  let testCwd: string;

  if (standaloneProjectDir) {
    // Use the standalone project generated in .screenshot-uitest/
    projectFlag = `-project "${join(standaloneProjectDir, `${UITEST_TARGET}.xcodeproj`)}"`;
    testCwd = standaloneProjectDir;
  } else {
    projectFlag = appInfo.xcodeproj
      ? `-project "${join(iosDir, appInfo.xcodeproj)}"`
      : "";
    testCwd = iosDir;
  }

  try {
    await exec(
      `xcodebuild test ` +
      `${projectFlag} ` +
      `-scheme "${UITEST_TARGET}" ` +
      `-destination "id=${simulatorUdid}" ` +
      `-derivedDataPath "${buildDir}" ` +
      `-only-testing:${UITEST_TARGET}/ScreenshotUITest/testNavigateAndScreenshot ` +
      `2>&1`,
      { cwd: testCwd, timeout: 300_000 },
    );
  } catch (err: any) {
    const output = ((err.stderr ?? "") + "\n" + (err.stdout ?? "")).slice(-500);
    // The test might "fail" but still produce the screenshot
    if (!existsSync(screenshotOutputPath)) {
      throw new Error(`XCUITest failed:\n${output}`);
    }
  } finally {
    // Restore original project.yml for xcodegen projects
    if (originalProjectYml) {
      writeFileSync(projectYmlPath, originalProjectYml);
      // Regenerate to restore original xcodeproj
      try { await exec(`xcodegen generate`, { cwd: iosDir, timeout: 30_000 }); } catch { /* best effort */ }
    }
  }
}

// ── screenshot capture (simple, no nav) ─────────────────────────────

export async function captureScreenshot(udid: string, localPath: string): Promise<void> {
  await exec(`xcrun simctl io ${udid} screenshot "${localPath}"`, { timeout: 15_000 });
}

// ── wait for app ready ──────────────────────────────────────────────

async function waitForAppReady(udid: string, bundleId: string, waitMs: number): Promise<void> {
  const startTime = Date.now();
  const timeout = Math.min(waitMs, 15_000);

  while (Date.now() - startTime < timeout) {
    try {
      const { stdout } = await exec(`xcrun simctl spawn ${udid} launchctl list`);
      if (stdout.includes(bundleId)) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(waitMs - elapsed, 500);
        await new Promise(r => setTimeout(r, remaining));
        return;
      }
    } catch { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 500));
  }

  await new Promise(r => setTimeout(r, waitMs));
}

// ── main entry point ────────────────────────────────────────────────

export async function takeIOSScreenshot(
  projectCwd: string,
  options: IOSScreenshotOptions,
): Promise<ScreenshotResult> {
  const {
    screen,
    device,
    nav,
    theme,
    wait_for = 3000,
    output_dir,
    project_dir,
    scheme,
    bundle_id,
  } = options;

  // 1. Find iOS project
  const iosDir = findIOSAppDir(projectCwd, project_dir);
  const appInfo = extractAppInfo(iosDir, { scheme, bundle_id });

  // 2. Find and boot simulator
  const sim = findSimulator(device);
  await ensureSimulatorBooted(sim.udid);

  // 3. Set theme if requested
  if (theme) {
    await setAppearance(sim.udid, theme);
  }

  // 4. Capture screenshot
  const screenLabel = screen ?? "main";
  const themeLabel = theme ?? "default";
  const filename = `${screenLabel}_${themeLabel}.png`;
  const tmpPath = join(iosDir, ".openuispec-screenshot.png");

  if (nav && nav.length > 0) {
    // Use XCUITest for navigation + screenshot (builds both targets via xcodebuild test)
    await runXCUITest(iosDir, appInfo, sim.udid, nav, wait_for, tmpPath);
  } else {
    // Simple: build, install, launch, wait, screencap
    const appBundlePath = await buildApp(iosDir, appInfo, sim.udid);
    await installAndLaunch(sim.udid, appBundlePath, appInfo.bundleId);
    await waitForAppReady(sim.udid, appInfo.bundleId, wait_for);
    await captureScreenshot(sim.udid, tmpPath);
  }

  if (!existsSync(tmpPath)) {
    return {
      content: [{ type: "text", text: "No screenshot was captured. Check Xcode and Simulator output." }],
      isError: true,
    };
  }

  // 6. Save to output_dir if specified
  let savedPath: string | undefined;
  if (output_dir) {
    const outDir = resolve(iosDir, output_dir);
    mkdirSync(outDir, { recursive: true });
    savedPath = join(outDir, filename);
    copyFileSync(tmpPath, savedPath);
  }

  // 7. Read and return
  try {
    const data = readFileSync(tmpPath).toString("base64");
    const snapshots = [{
      screen: screenLabel,
      path: savedPath ?? filename,
      data,
    }];

    return buildScreenshotResponse(snapshots, (s) => ({
      screen: s.screen,
      path: savedPath ?? null,
      simulator: sim.name,
      theme: themeLabel,
      bundleId: appInfo.bundleId,
    }));
  } finally {
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}
