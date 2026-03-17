/**
 * Android screenshot tool — builds the app, installs on an emulator,
 * and captures real screenshots via adb screencap.
 *
 * Gives pixel-perfect results with real navigation, images, themes,
 * and all runtime behavior. Requires a running Android emulator.
 */

import { exec as execCb, execSync } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, unlinkSync, mkdirSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  type ScreenshotResult,
  findPlatformAppDir,
  buildScreenshotResponse,
} from "./screenshot-shared.js";

const exec = promisify(execCb);
const androidScreenshotQueues = new Map<string, Promise<void>>();

// ── types ───────────────────────────────────────────────────────────

export interface AndroidScreenshotOptions {
  screen?: string;
  route?: string;
  nav?: string[];
  theme?: "light" | "dark";
  wait_for?: number;
  output_dir?: string;
  project_dir?: string;
  module?: string;
}

export interface AndroidBatchCapture {
  screen: string;
  route?: string;
  nav?: string[];
  wait_for?: number;
}

export interface AndroidScreenshotBatchOptions {
  captures: AndroidBatchCapture[];
  theme?: "light" | "dark";
  output_dir?: string;
  project_dir?: string;
  module?: string;
}

// ── constants ───────────────────────────────────────────────────────

const ADB_SCREENSHOT_PATH = "/sdcard/openuispec_screenshot.png";

// ── Android app directory discovery ─────────────────────────────────

function isAndroidProject(dir: string): boolean {
  return existsSync(join(dir, "gradlew")) ||
    existsSync(join(dir, "app", "build.gradle.kts")) ||
    existsSync(join(dir, "app", "build.gradle"));
}

export function findAndroidAppDir(projectCwd: string, directDir?: string): string {
  return findPlatformAppDir(projectCwd, "android", isAndroidProject, directDir);
}

// ── app module auto-detection ────────────────────────────────────────

export function detectAppModule(androidDir: string): string {
  // Read settings.gradle.kts or settings.gradle to find included modules
  for (const settingsFile of ["settings.gradle.kts", "settings.gradle"]) {
    const settingsPath = join(androidDir, settingsFile);
    if (!existsSync(settingsPath)) continue;

    try {
      const content = readFileSync(settingsPath, "utf-8");
      // Match include(":app"), include(":module1", ":module2"), include ":app"
      const modules: string[] = [];
      const includeMatches = content.matchAll(/include\s*\(?([^)\n]+)\)?/g);
      for (const m of includeMatches) {
        const args = m[1];
        const moduleNames = args.matchAll(/[":]+([^",:)\s]+)/g);
        for (const mn of moduleNames) {
          modules.push(mn[1]);
        }
      }

      // For each module, check if its build.gradle.kts/.gradle has com.android.application
      for (const mod of modules) {
        const modDir = join(androidDir, mod);
        for (const buildFile of ["build.gradle.kts", "build.gradle"]) {
          const buildPath = join(modDir, buildFile);
          if (!existsSync(buildPath)) continue;
          try {
            const buildContent = readFileSync(buildPath, "utf-8");
            if (buildContent.includes("com.android.application")) {
              return mod;
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  return "app"; // fallback
}

// ── app package / activity extraction ───────────────────────────────

export interface AppInfo {
  applicationId: string;
  launchActivity: string;
  moduleName: string;
}

function readBuildFile(androidDir: string, moduleName: string): string | null {
  for (const filename of ["build.gradle.kts", "build.gradle"]) {
    try { return readFileSync(join(androidDir, moduleName, filename), "utf-8"); } catch { /* skip */ }
  }
  return null;
}

export function extractAppInfo(androidDir: string, moduleOverride?: string): AppInfo {
  const moduleName = moduleOverride ?? detectAppModule(androidDir);

  // Try to get applicationId from build.gradle.kts or build.gradle
  let applicationId = "";
  const buildContent = readBuildFile(androidDir, moduleName);
  if (buildContent) {
    // Kotlin DSL: applicationId = "..."
    const appIdMatch = buildContent.match(/applicationId\s*=\s*"([^"]+)"/);
    if (appIdMatch) applicationId = appIdMatch[1];
    if (!applicationId) {
      // Groovy DSL: applicationId "..." or applicationId '...'
      const groovyMatch = buildContent.match(/applicationId\s+['"]([^'"]+)['"]/);
      if (groovyMatch) applicationId = groovyMatch[1];
    }
    if (!applicationId) {
      const nsMatch = buildContent.match(/namespace\s*=?\s*['"]([^'"]+)['"]/);
      if (nsMatch) applicationId = nsMatch[1];
    }
  }

  // Get launch activity from AndroidManifest.xml
  let launchActivity = ".MainActivity";
  const manifestPath = join(androidDir, moduleName, "src", "main", "AndroidManifest.xml");
  try {
    const manifest = readFileSync(manifestPath, "utf-8");
    // Find activity with MAIN/LAUNCHER intent filter
    const activityMatch = manifest.match(
      /<activity[^>]*android:name="([^"]+)"[^]*?action android:name="android\.intent\.action\.MAIN"/,
    );
    if (activityMatch) launchActivity = activityMatch[1];

    // If applicationId still empty, try manifest package
    if (!applicationId) {
      const pkgMatch = manifest.match(/package="([^"]+)"/);
      if (pkgMatch) applicationId = pkgMatch[1];
    }
  } catch { /* use defaults */ }

  if (!applicationId) {
    throw new Error(
      `Could not determine applicationId from ${moduleName}/build.gradle.kts (or .gradle) or AndroidManifest.xml`,
    );
  }

  // Resolve relative activity name
  const fullActivity = launchActivity.startsWith(".")
    ? `${applicationId}${launchActivity}`
    : launchActivity;

  return { applicationId, launchActivity: fullActivity, moduleName };
}

// ── adb helpers ─────────────────────────────────────────────────────

export function findAdb(): string {
  // Check ANDROID_HOME first
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (androidHome) {
    const adbPath = join(androidHome, "platform-tools", "adb");
    if (existsSync(adbPath)) return adbPath;
  }
  // Fall back to PATH
  try {
    execSync("which adb", { stdio: "pipe" });
    return "adb";
  } catch {
    throw new Error(
      "adb not found. Set ANDROID_HOME or add platform-tools to PATH.\n" +
      "Install via Android Studio or: sdkmanager 'platform-tools'",
    );
  }
}

export async function getConnectedEmulator(adb: string): Promise<string> {
  try {
    const { stdout } = await exec(`${adb} devices`);
    const lines = stdout.trim().split("\n").slice(1); // skip header
    for (const line of lines) {
      const [serial, state] = line.split("\t");
      if (state === "device" && (serial.startsWith("emulator-") || serial.includes(":"))) {
        return serial;
      }
    }
    // Also accept physical devices if no emulator
    for (const line of lines) {
      const [serial, state] = line.split("\t");
      if (state === "device") return serial;
    }
  } catch { /* fall through */ }

  throw new Error(
    "No connected Android device or emulator found.\n" +
    "Start an emulator from Android Studio or run: emulator -avd <avd_name>",
  );
}

export async function adbShell(adb: string, serial: string, cmd: string): Promise<string> {
  const { stdout } = await exec(`${adb} -s ${serial} shell ${cmd}`, { timeout: 30_000 });
  return stdout.trim();
}

export async function adbExec(adb: string, serial: string, args: string): Promise<string> {
  const { stdout } = await exec(`${adb} -s ${serial} ${args}`, { timeout: 60_000 });
  return stdout.trim();
}

// ── emulator storage cleanup ─────────────────────────────────────────

export async function cleanEmulatorStorage(adb: string, serial: string): Promise<void> {
  const cmds = [
    `pm trim-caches 2G`,                    // aggressively trim package cache
    `rm -rf /data/local/tmp/*.apk`,          // leftover APKs from previous installs
    `rm -f /sdcard/openuispec_screenshot.png /sdcard/ui_dump.xml /sdcard/screenshot.png`,
  ];
  for (const cmd of cmds) {
    try { await adbShell(adb, serial, cmd); } catch { /* ignore */ }
  }
}

// ── build APK ───────────────────────────────────────────────────────

export async function buildApk(androidDir: string, moduleName: string): Promise<string> {
  if (!existsSync(join(androidDir, "gradlew"))) {
    throw new Error(`No gradlew found in ${androidDir}. Initialize the Gradle wrapper first.`);
  }

  try {
    await exec(`./gradlew :${moduleName}:assembleDebug`, {
      cwd: androidDir,
      timeout: 300_000,
      env: { ...process.env, JAVA_OPTS: "-Xmx2g" },
    });
  } catch (err: any) {
    const output = ((err.stderr ?? "") + "\n" + (err.stdout ?? "")).slice(-500);
    throw new Error(`APK build failed:\n${output}`);
  }

  // Find the built APK
  const apkCandidates = [
    join(androidDir, moduleName, "build", "outputs", "apk", "debug", `${moduleName}-debug.apk`),
    join(androidDir, moduleName, "build", "outputs", "apk", "debug", `${moduleName}-debug-unsigned.apk`),
    // Common fallback names
    join(androidDir, moduleName, "build", "outputs", "apk", "debug", "app-debug.apk"),
    join(androidDir, moduleName, "build", "outputs", "apk", "debug", "app-debug-unsigned.apk"),
  ];
  for (const apk of apkCandidates) {
    if (existsSync(apk)) return apk;
  }

  throw new Error(`APK not found after build in ${moduleName}/build/outputs/. Check Gradle output.`);
}

// ── install & launch ────────────────────────────────────────────────

export async function installAndLaunch(
  adb: string,
  serial: string,
  apkPath: string,
  appInfo: AppInfo,
  route?: string,
): Promise<void> {
  // Force-stop and uninstall to free storage + wipe saved nav state
  await adbShell(adb, serial, `am force-stop ${appInfo.applicationId}`);
  try { await adbShell(adb, serial, `pm uninstall ${appInfo.applicationId}`); } catch { /* not installed */ }

  // Install fresh (not -r replace, since we uninstalled)
  await adbExec(adb, serial, `install "${apkPath}"`);

  if (route) {
    await adbShell(adb, serial,
      `am start -W -a android.intent.action.VIEW -d '${route}' ` +
      `${appInfo.applicationId}/${appInfo.launchActivity}`);
  } else {
    await adbShell(adb, serial,
      `am start -W -n ${appInfo.applicationId}/${appInfo.launchActivity}`);
  }
}

export async function launchInstalledApp(
  adb: string,
  serial: string,
  appInfo: AppInfo,
  route?: string,
): Promise<void> {
  await adbShell(adb, serial, `am force-stop ${appInfo.applicationId}`);
  // Clear saved nav state so deep links route correctly
  try { await adbShell(adb, serial, `pm clear ${appInfo.applicationId}`); } catch { /* ignore */ }
  if (route) {
    await adbShell(
      adb,
      serial,
      `am start -W -a android.intent.action.VIEW -d '${route}' ` +
        `${appInfo.applicationId}/${appInfo.launchActivity}`,
    );
  } else {
    await adbShell(adb, serial, `am start -W -n ${appInfo.applicationId}/${appInfo.launchActivity}`);
  }
}

// ── theme control ───────────────────────────────────────────────────

export async function setTheme(adb: string, serial: string, theme: "light" | "dark"): Promise<void> {
  const mode = theme === "dark" ? "yes" : "no";
  await adbShell(adb, serial, `cmd uimode night ${mode}`);
}

// ── UI navigation via tap ───────────────────────────────────────────

export async function tapByText(adb: string, serial: string, text: string): Promise<void> {
  // Dump UI hierarchy
  await adbShell(adb, serial, `uiautomator dump /sdcard/ui_dump.xml`);
  const xml = await adbShell(adb, serial, `cat /sdcard/ui_dump.xml`);
  await adbShell(adb, serial, `rm /sdcard/ui_dump.xml`);

  const lowerText = text.toLowerCase();

  // Parse each <node .../> extracting text, content-desc, and bounds
  const nodeRegex = /<node\s[^>]+>/g;
  interface UiNode { text: string; desc: string; cx: number; cy: number }
  const nodes: UiNode[] = [];

  let nodeMatch;
  while ((nodeMatch = nodeRegex.exec(xml)) !== null) {
    const attrs = nodeMatch[0];
    const textMatch = attrs.match(/\btext="([^"]*)"/);
    const descMatch = attrs.match(/\bcontent-desc="([^"]*)"/);
    const boundsMatch = attrs.match(/\bbounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (!boundsMatch) continue;

    nodes.push({
      text: textMatch?.[1] ?? "",
      desc: descMatch?.[1] ?? "",
      cx: Math.round((parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2),
      cy: Math.round((parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2),
    });
  }

  // Exact match on text or content-desc
  for (const node of nodes) {
    if (node.text.toLowerCase() === lowerText || node.desc.toLowerCase() === lowerText) {
      await adbShell(adb, serial, `input tap ${node.cx} ${node.cy}`);
      return;
    }
  }

  // Partial/contains match
  for (const node of nodes) {
    if (node.text.toLowerCase().includes(lowerText) || node.desc.toLowerCase().includes(lowerText)) {
      await adbShell(adb, serial, `input tap ${node.cx} ${node.cy}`);
      return;
    }
  }

  throw new Error(`UI element with text "${text}" not found on screen.`);
}

export async function navigateByTaps(
  adb: string,
  serial: string,
  steps: string[],
): Promise<void> {
  for (const step of steps) {
    await tapByText(adb, serial, step);
    // Wait for navigation animation
    await new Promise(r => setTimeout(r, 800));
  }
}

// ── screenshot capture ──────────────────────────────────────────────

export async function captureScreenshot(
  adb: string,
  serial: string,
  localPath: string,
): Promise<void> {
  try {
    await exec(`${adb} -s ${serial} exec-out screencap -p > "${localPath}"`, { timeout: 60_000, shell: "/bin/bash" });
  } catch (err: any) {
    const output = ((err.stderr ?? "") + "\n" + (err.stdout ?? "")).trim();
    throw new Error(`Android screenshot capture failed${output ? `:\n${output}` : "."}`);
  }
}

// ── wait for app ready ──────────────────────────────────────────────

async function waitForAppReady(
  adb: string,
  serial: string,
  applicationId: string,
  waitMs: number,
): Promise<void> {
  // Wait for the activity to be in resumed state
  const startTime = Date.now();
  const timeout = Math.min(waitMs, 15_000);

  while (Date.now() - startTime < timeout) {
    try {
      const output = await adbShell(adb, serial,
        `dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity"`,
      );
      if (output.includes(applicationId)) {
        // App is in foreground, wait the remaining time for content to load
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(waitMs - elapsed, 500);
        await new Promise(r => setTimeout(r, remaining));
        return;
      }
    } catch { /* activity not ready yet */ }
    await new Promise(r => setTimeout(r, 500));
  }

  // Fallback: just wait the full duration
  await new Promise(r => setTimeout(r, waitMs));
}

async function takeSingleAndroidCapture(
  adb: string,
  serial: string,
  androidDir: string,
  appInfo: AppInfo,
  capture: AndroidBatchCapture,
  theme: "light" | "dark" | undefined,
  defaultOutputDir: string | undefined,
): Promise<{ screen: string; path: string; data: string }> {
  await launchInstalledApp(adb, serial, appInfo, capture.route);
  await waitForAppReady(adb, serial, appInfo.applicationId, capture.wait_for ?? 3000);

  if (capture.nav && capture.nav.length > 0) {
    await navigateByTaps(adb, serial, capture.nav);
  }

  const themeLabel = theme ?? "default";
  const filename = `${capture.screen}_${themeLabel}.png`;
  const tmpPath = join(androidDir, `.openuispec-screenshot-${capture.screen}.png`);
  await captureScreenshot(adb, serial, tmpPath);

  let savedPath = filename;
  if (defaultOutputDir) {
    const outDir = resolve(androidDir, defaultOutputDir);
    mkdirSync(outDir, { recursive: true });
    savedPath = join(outDir, filename);
    copyFileSync(tmpPath, savedPath);
  }

  try {
    const data = readFileSync(tmpPath).toString("base64");
    return {
      screen: capture.screen,
      path: savedPath,
      data,
    };
  } finally {
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}

// ── main entry point ────────────────────────────────────────────────

export async function takeAndroidScreenshot(
  projectCwd: string,
  options: AndroidScreenshotOptions,
): Promise<ScreenshotResult> {
  const {
    screen,
    route,
    nav,
    theme,
    wait_for = 3000,
    output_dir,
    project_dir,
    module,
  } = options;

  // 1. Find Android project
  const androidDir = findAndroidAppDir(projectCwd, project_dir);
  const appInfo = extractAppInfo(androidDir, module);

  // 2. Find adb and emulator
  const adb = findAdb();
  const serial = await getConnectedEmulator(adb);

  const previousRun = androidScreenshotQueues.get(serial) ?? Promise.resolve();
  let releaseQueue: (() => void) | undefined;
  const currentRun = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  androidScreenshotQueues.set(serial, previousRun.then(() => currentRun));

  await previousRun;

  try {
    // 3. Free emulator storage before build/install
    await cleanEmulatorStorage(adb, serial);

    // 4. Build APK
    const apkPath = await buildApk(androidDir, appInfo.moduleName);

    // 5. Set theme if requested
    if (theme) {
      await setTheme(adb, serial, theme);
    }

    // 6. Install fresh once, then capture
    await installAndLaunch(adb, serial, apkPath, appInfo, route);

    const snapshot = await takeSingleAndroidCapture(
      adb,
      serial,
      androidDir,
      appInfo,
      { screen: screen ?? "main", route, nav, wait_for },
      theme,
      output_dir,
    );

    return buildScreenshotResponse([snapshot], (s) => ({
      screen: s.screen,
      path: snapshot.path ?? null,
      emulator: serial,
      theme: theme ?? "default",
      applicationId: appInfo.applicationId,
    }));
  } finally {
    releaseQueue?.();
    if (androidScreenshotQueues.get(serial) === currentRun) {
      androidScreenshotQueues.delete(serial);
    }
  }
}

export async function takeAndroidScreenshotBatch(
  projectCwd: string,
  options: AndroidScreenshotBatchOptions,
): Promise<ScreenshotResult> {
  const { captures, theme, output_dir, project_dir, module } = options;
  if (captures.length === 0) {
    return {
      content: [{ type: "text", text: "No Android captures specified." }],
      isError: true,
    };
  }

  const androidDir = findAndroidAppDir(projectCwd, project_dir);
  const appInfo = extractAppInfo(androidDir, module);
  const adb = findAdb();
  const serial = await getConnectedEmulator(adb);

  const previousRun = androidScreenshotQueues.get(serial) ?? Promise.resolve();
  let releaseQueue: (() => void) | undefined;
  const currentRun = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  androidScreenshotQueues.set(serial, previousRun.then(() => currentRun));

  await previousRun;

  try {
    await cleanEmulatorStorage(adb, serial);
    const apkPath = await buildApk(androidDir, appInfo.moduleName);

    if (theme) {
      await setTheme(adb, serial, theme);
    }

    await installAndLaunch(adb, serial, apkPath, appInfo);

    // Pre-create output dir once
    if (output_dir) mkdirSync(resolve(androidDir, output_dir), { recursive: true });

    const snapshots = [];
    for (let index = 0; index < captures.length; index += 1) {
      const capture = captures[index];
      snapshots.push(
        await takeSingleAndroidCapture(
          adb,
          serial,
          androidDir,
          appInfo,
          capture,
          theme,
          output_dir,
        ),
      );
    }

    return buildScreenshotResponse(snapshots, (snapshot) => ({
      screen: snapshot.screen,
      path: snapshot.path,
      emulator: serial,
      theme: theme ?? "default",
      applicationId: appInfo.applicationId,
    }));
  } finally {
    releaseQueue?.();
    if (androidScreenshotQueues.get(serial) === currentRun) {
      androidScreenshotQueues.delete(serial);
    }
  }
}
