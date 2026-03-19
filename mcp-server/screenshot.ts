/**
 * Screenshot tool — launches dev server + headless browser, captures pages.
 *
 * Both the Vite dev server and the Puppeteer browser are kept alive between
 * calls and torn down when the MCP server process exits.
 */

import { spawn, type ChildProcess, execSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createConnection } from "node:net";
import YAML from "yaml";
import { findProjectDir } from "../drift/index.js";
import { getBrowser, closeBrowser, type ScreenshotResult } from "./screenshot-shared.js";

// ── types ───────────────────────────────────────────────────────────

export interface ScreenshotOptions {
  route: string;
  viewport?: { width: number; height: number };
  scale?: number;
  theme?: "light" | "dark";
  wait_for?: number;
  full_page?: boolean;
  selector?: string;
  output_dir?: string;
  init_script?: string;
}

// ── framework config table ───────────────────────────────────────────

interface FrameworkConfig {
  /** Typed discriminant for branching logic */
  kind: "node" | "bun" | "deno" | "python-django" | "python-flask" | "ruby" | "php" | "go" | "rust" | "java";
  /** Human-readable name */
  name: string;
  /** Files whose presence identifies this framework (checked in webDir) */
  indicators: string[];
  /** Default dev port when none is configured */
  defaultPort: number;
  /** Command + args to start the dev server; PORT placeholder replaced at runtime */
  devCommand: string[];
  /** Install command to run when dependencies are missing (null = skip) */
  installCommand: string[] | null;
  /** Package manager env var used to set the port (e.g. PORT, APP_PORT) */
  portEnvVar: string;
}

// Ordered by detection priority (most specific first)
const FRAMEWORKS: FrameworkConfig[] = [
  {
    kind: "bun",
    name: "Bun",
    indicators: ["bun.lockb", "bun.lock"],
    defaultPort: 3000,
    devCommand: ["bun", "run", "dev"],
    installCommand: ["bun", "install"],
    portEnvVar: "PORT",
  },
  {
    kind: "deno",
    name: "Deno",
    indicators: ["deno.json", "deno.jsonc"],
    defaultPort: 8000,
    devCommand: ["deno", "task", "dev"],
    installCommand: null,
    portEnvVar: "PORT",
  },
  {
    kind: "node",
    name: "Node.js (npm/yarn/pnpm)",
    indicators: ["package.json"],
    defaultPort: 3000,
    devCommand: ["npm", "run", "dev"],
    installCommand: ["npm", "install"],
    portEnvVar: "PORT",
  },
  {
    kind: "python-django",
    name: "Django",
    indicators: ["manage.py"],
    defaultPort: 8000,
    devCommand: ["python", "manage.py", "runserver", "PORT"],
    installCommand: null,
    portEnvVar: "PORT",
  },
  {
    kind: "python-flask",
    name: "Flask / FastAPI",
    indicators: ["requirements.txt", "Pipfile", "pyproject.toml"],
    defaultPort: 5000,
    devCommand: ["python", "-m", "flask", "run", "--port", "PORT"],
    installCommand: null,
    portEnvVar: "PORT",
  },
  {
    kind: "ruby",
    name: "Ruby on Rails",
    indicators: ["Gemfile", "config/application.rb"],
    defaultPort: 3000,
    devCommand: ["bin/rails", "server", "-p", "PORT"],
    installCommand: ["bundle", "install"],
    portEnvVar: "PORT",
  },
  {
    kind: "php",
    name: "PHP (Laravel)",
    indicators: ["artisan"],
    defaultPort: 8000,
    devCommand: ["php", "artisan", "serve", "--port=PORT"],
    installCommand: null,
    portEnvVar: "PORT",
  },
  {
    kind: "go",
    name: "Go",
    indicators: ["go.mod"],
    defaultPort: 8080,
    devCommand: ["go", "run", "."],
    installCommand: null,
    portEnvVar: "PORT",
  },
  {
    kind: "rust",
    name: "Rust (Trunk)",
    indicators: ["Trunk.toml", "Cargo.toml"],
    defaultPort: 8080,
    devCommand: ["trunk", "serve", "--port", "PORT"],
    installCommand: null,
    portEnvVar: "PORT",
  },
  {
    kind: "java",
    name: "Java / Spring Boot",
    indicators: ["pom.xml", "build.gradle", "build.gradle.kts"],
    defaultPort: 8080,
    devCommand: ["./mvnw", "spring-boot:run"],
    installCommand: null,
    portEnvVar: "SERVER_PORT",
  },
];

// ── framework detection ──────────────────────────────────────────────

function detectFramework(webDir: string): FrameworkConfig {
  for (const fw of FRAMEWORKS) {
    if (fw.indicators.some((f) => existsSync(join(webDir, f)))) return fw;
  }
  // Fallback: generic Node
  return FRAMEWORKS.find((f) => f.kind === "node")!;
}

// ── port resolution ──────────────────────────────────────────────────

/** Parse --port / -p / --port=N from a script string. */
function parsePortFromScript(script: string): number | null {
  const m = script.match(/(?:--port|-p)[=\s]+(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Read PORT (or custom var) from .env.local / .env.development / .env. */
function readEnvPort(webDir: string, varName = "PORT"): number | null {
  for (const name of [".env.local", ".env.development", ".env"]) {
    const envPath = join(webDir, name);
    if (!existsSync(envPath)) continue;
    try {
      const re = new RegExp(`^\\s*${varName}\\s*=\\s*(\\d+)`, "m");
      const m = readFileSync(envPath, "utf-8").match(re);
      if (m) return parseInt(m[1], 10);
    } catch { /* skip */ }
  }
  return null;
}

/** Resolve the port this project's dev server will use. */
function resolvePort(webDir: string, fw: FrameworkConfig): number {
  // 1. .env files
  const envPort = readEnvPort(webDir, fw.portEnvVar);
  if (envPort) return envPort;

  // 2. package.json dev/start script (Node-like only)
  if (existsSync(join(webDir, "package.json"))) {
    try {
      const pkg = JSON.parse(readFileSync(join(webDir, "package.json"), "utf-8"));
      const scripts: Record<string, string> = pkg.scripts ?? {};
      for (const name of ["dev", "start", "serve", "develop"]) {
        if (scripts[name]) {
          const p = parsePortFromScript(scripts[name]);
          if (p) return p;
          break;
        }
      }
    } catch { /* ignore */ }
  }

  // 3. Framework default
  return fw.defaultPort;
}

function isPortListening(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    socket.setTimeout(500);
    socket.on("connect", () => { socket.destroy(); resolve(true); });
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
    socket.on("error", () => resolve(false));
  });
}

// ── web app directory discovery ─────────────────────────────────────

export function findWebAppDir(projectCwd: string): string {
  const projectDir = findProjectDir(projectCwd);
  const manifestPath = join(projectDir, "openuispec.yaml");
  const manifest = YAML.parse(readFileSync(manifestPath, "utf-8"));
  const projectName = manifest.project?.name ?? "app";

  // Derive indicators from the FRAMEWORKS table so they stay in sync
  const isWebDir = (d: string) =>
    FRAMEWORKS.some((fw) => fw.indicators.some((f) => existsSync(join(d, f))));

  // Check custom output_dir first
  const customDir = manifest.generation?.output_dir?.web;
  if (customDir) {
    const resolved = resolve(projectDir, customDir);
    if (isWebDir(resolved)) return resolved;
  }

  // Default: generated/web/<project-name>/
  // Try from the project root (parent of openuispec/)
  const projectRoot = resolve(projectDir, "..");
  const defaultDir = join(projectRoot, "generated", "web", projectName);
  if (isWebDir(defaultDir)) return defaultDir;

  throw new Error(
    `Web app not found. Checked:\n` +
    (customDir ? `  - ${resolve(projectDir, customDir)}\n` : "") +
    `  - ${defaultDir}\n` +
    `Generate the web target first, then try again.`,
  );
}

// ── dev server manager ──────────────────────────────────────────────

interface ServerInstance {
  process: ChildProcess | null; // null = using an externally running server
  port: number;
  url: string;
}

const servers = new Map<string, ServerInstance>();

function ensureDepsInstalled(webDir: string, fw: FrameworkConfig): void {
  if (!fw.installCommand) return;
  // For Node.js check node_modules; for others always run
  if (fw.kind === "node" && existsSync(join(webDir, "node_modules"))) return;
  try {
    execSync(fw.installCommand.join(" "), { cwd: webDir, stdio: "pipe", timeout: 120_000 });
  } catch (err) {
    throw new Error(`Failed to install dependencies in ${webDir}: ${err instanceof Error ? err.message : err}`);
  }
}

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

/** Poll until the port accepts connections, or the timeout expires. */
async function waitForPort(port: number, timeoutMs = 60_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortListening(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function startDevServer(webDir: string): Promise<ServerInstance> {
  const existing = servers.get(webDir);
  if (existing) {
    const alive = existing.process === null
      ? await isPortListening(existing.port)   // external server
      : existing.process.exitCode === null;     // managed process
    if (alive) return existing;
    servers.delete(webDir);
  }

  const fw = detectFramework(webDir);
  const port = resolvePort(webDir, fw);

  // Always prefer an already-running server on the expected port
  if (await isPortListening(port)) {
    const instance: ServerInstance = { process: null, port, url: `http://localhost:${port}` };
    servers.set(webDir, instance);
    return instance;
  }

  // Start the dev server for this framework
  ensureDepsInstalled(webDir, fw);

  // Build command: replace "PORT" placeholder with actual port string
  const [cmd, ...args] = fw.devCommand.map((part) => part === "PORT" ? String(port) : part);

  // For Node.js, use the project's own dev script from package.json if available
  let spawnCmd = cmd;
  let spawnArgs = args;
  if (fw.kind === "node" && existsSync(join(webDir, "package.json"))) {
    try {
      const pkg = JSON.parse(readFileSync(join(webDir, "package.json"), "utf-8"));
      const scripts: Record<string, string> = pkg.scripts ?? {};
      const scriptName = ["dev", "start", "serve", "develop"].find((n) => n in scripts);
      if (scriptName) {
        spawnCmd = "npm";
        spawnArgs = ["run", scriptName];
      }
    } catch { /* ignore */ }
  }

  const child = spawn(spawnCmd, spawnArgs, {
    cwd: webDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0", BROWSER: "none", [fw.portEnvVar]: String(port) },
  });

  // Collect stderr from the start so we have output for error messages
  let stderr = "";
  child.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

  // Wait for the port to open (framework-agnostic — no stdout parsing needed)
  const ready = await waitForPort(port, 60_000);

  if (!ready) {
    child.kill();
    throw new Error(
      `${fw.name} dev server did not open port ${port} within 60s.\n` +
      (stderr ? `stderr:\n${stripAnsi(stderr).slice(-500)}` : ""),
    );
  }

  const instance: ServerInstance = { process: child, port, url: `http://localhost:${port}` };
  servers.set(webDir, instance);
  return instance;
}

// ── browser manager (imported from screenshot-shared.ts) ────────────

// ── init_script URL injection ────────────────────────────────────────

/** Append ?__ous_init=<base64> to a URL, respecting existing query params. */
function appendInitParam(targetUrl: string, initScript: string): string {
  const url = new URL(targetUrl);
  url.searchParams.set("__ous_init", Buffer.from(initScript).toString("base64"));
  return url.toString();
}

// ── screenshot capture ──────────────────────────────────────────────

export async function takeScreenshot(
  projectCwd: string,
  options: ScreenshotOptions,
): Promise<ScreenshotResult> {
  const {
    route = "/",
    viewport = { width: 1280, height: 800 },
    scale = 2,
    theme,
    wait_for = 1000,
    full_page = false,
    selector,
    output_dir,
    init_script,
  } = options;

  // 1. Find and start
  const webDir = findWebAppDir(projectCwd);
  const server = await startDevServer(webDir);
  const browser = await getBrowser();

  // 2. Navigate
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: scale,
    });

    if (theme) {
      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: theme },
      ]);
    }

    const base = server.url.replace(/\/+$/, "");
    let targetUrl = `${base}${route.startsWith("/") ? "" : "/"}${route}`;
    if (init_script) targetUrl = appendInitParam(targetUrl, init_script);
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 30_000 });

    if (wait_for > 0) {
      await new Promise((r) => setTimeout(r, wait_for));
    }

    // 3. Screenshot
    let buffer: Buffer;
    if (selector) {
      const element = await page.$(selector);
      if (!element) {
        return {
          content: [{ type: "text", text: `Error: Element not found for selector: ${selector}` }],
          isError: true,
        };
      }
      buffer = await element.screenshot({ type: "png" });
    } else {
      buffer = await page.screenshot({ type: "png", fullPage: full_page });
    }

    const base64 = buffer.toString("base64");

    // Save to output_dir if specified
    let savedPath: string | undefined;
    if (output_dir) {
      const outDir = resolve(webDir, output_dir);
      mkdirSync(outDir, { recursive: true });
      const routeSlug = route.replace(/^\//, "").replace(/\//g, "_") || "index";
      const themeLabel = theme ?? "default";
      savedPath = join(outDir, `${routeSlug}_${themeLabel}.png`);
      writeFileSync(savedPath, buffer);
    }

    return {
      content: [
        { type: "image" as const, data: base64, mimeType: "image/png" },
        {
          type: "text" as const,
          text: JSON.stringify({
            route,
            url: targetUrl,
            viewport,
            scale,
            theme: theme ?? "default",
            full_page,
            selector: selector ?? null,
            path: savedPath ?? null,
            init_script: init_script ?? null,
          }, null, 2),
        },
      ],
    };
  } finally {
    await page.close();
  }
}

// ── batch types ──────────────────────────────────────────────────────

export interface WebBatchCapture {
  screen: string;
  route: string;
  selector?: string;
  full_page?: boolean;
  wait_for?: number;
  init_script?: string;
}

export interface WebScreenshotBatchOptions {
  captures: WebBatchCapture[];
  viewport?: { width: number; height: number };
  scale?: number;
  theme?: "light" | "dark";
  output_dir?: string;
  init_script?: string;
}

// ── batch screenshot ─────────────────────────────────────────────────

export async function takeScreenshotBatch(
  projectCwd: string,
  options: WebScreenshotBatchOptions,
): Promise<ScreenshotResult> {
  const { captures, viewport = { width: 1280, height: 800 }, scale = 2, theme, output_dir, init_script: sharedInitScript } = options;

  if (captures.length === 0) {
    return { content: [{ type: "text", text: "No web captures specified." }], isError: true };
  }

  const webDir = findWebAppDir(projectCwd);
  const server = await startDevServer(webDir);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: scale,
    });
    if (theme) {
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);
    }

    const base = server.url.replace(/\/+$/, "");
    const themeLabel = theme ?? "default";
    const snapshots: Array<{ screen: string; path: string; data: string; init_script?: string }> = [];

    for (const capture of captures) {
      const effectiveInitScript = capture.init_script ?? sharedInitScript;
      let targetUrl = `${base}${capture.route.startsWith("/") ? "" : "/"}${capture.route}`;
      if (effectiveInitScript) targetUrl = appendInitParam(targetUrl, effectiveInitScript);
      await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 30_000 });
      await new Promise((r) => setTimeout(r, capture.wait_for ?? 1000));

      let buffer: Buffer;
      if (capture.selector) {
        const el = await page.$(capture.selector);
        buffer = el ? await el.screenshot({ type: "png" }) : await page.screenshot({ type: "png" });
      } else {
        buffer = await page.screenshot({ type: "png", fullPage: capture.full_page ?? false });
      }

      const filename = `${capture.screen}_${themeLabel}.png`;
      let savedPath = filename;
      if (output_dir) {
        const outDir = resolve(webDir, output_dir);
        mkdirSync(outDir, { recursive: true });
        savedPath = join(outDir, filename);
        writeFileSync(savedPath, buffer);
      }

      snapshots.push({ screen: capture.screen, path: savedPath, data: buffer.toString("base64"), init_script: effectiveInitScript });
    }

    const content: ScreenshotResult["content"] = [];
    for (const s of snapshots) {
      content.push({ type: "image" as const, data: s.data, mimeType: "image/png" });
      content.push({
        type: "text" as const,
        text: JSON.stringify({ screen: s.screen, path: s.path, viewport, scale, theme: themeLabel, init_script: s.init_script ?? null }, null, 2),
      });
    }
    return { content };
  } finally {
    await page.close();
  }
}

// ── cleanup ─────────────────────────────────────────────────────────

function killAllServers() {
  for (const [, instance] of servers) {
    if (instance.process) {
      try { instance.process.kill(); } catch { /* already dead */ }
    }
  }
  servers.clear();
}

export async function shutdownAll() {
  killAllServers();
  await closeBrowser();
}

process.on("exit", killAllServers);
process.on("SIGINT", () => { shutdownAll().then(() => process.exit(0)); });
process.on("SIGTERM", () => { shutdownAll().then(() => process.exit(0)); });
