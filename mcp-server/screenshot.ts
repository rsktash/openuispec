/**
 * Screenshot tool — launches dev server + headless browser, captures pages.
 *
 * Both the Vite dev server and the Puppeteer browser are kept alive between
 * calls and torn down when the MCP server process exits.
 */

import { spawn, type ChildProcess, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createServer, type AddressInfo } from "node:net";
import YAML from "yaml";
import { findProjectDir } from "../drift/index.js";

// ── types ───────────────────────────────────────────────────────────

export interface ScreenshotOptions {
  route: string;
  viewport?: { width: number; height: number };
  theme?: "light" | "dark";
  wait_for?: number;
  full_page?: boolean;
  selector?: string;
}

export interface ScreenshotResult {
  content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }>;
  isError?: true;
}

// ── free port finder ────────────────────────────────────────────────

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, () => {
      const port = (srv.address() as AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

// ── web app directory discovery ─────────────────────────────────────

export function findWebAppDir(projectCwd: string): string {
  const projectDir = findProjectDir(projectCwd);
  const manifestPath = join(projectDir, "openuispec.yaml");
  const manifest = YAML.parse(readFileSync(manifestPath, "utf-8"));
  const projectName = manifest.project?.name ?? "app";

  // Check custom output_dir first
  const customDir = manifest.generation?.output_dir?.web;
  if (customDir) {
    const resolved = resolve(projectDir, customDir);
    if (existsSync(join(resolved, "package.json"))) return resolved;
  }

  // Default: generated/web/<project-name>/
  // Try from the project root (parent of openuispec/)
  const projectRoot = resolve(projectDir, "..");
  const defaultDir = join(projectRoot, "generated", "web", projectName);
  if (existsSync(join(defaultDir, "package.json"))) return defaultDir;

  throw new Error(
    `Web app not found. Checked:\n` +
    (customDir ? `  - ${resolve(projectDir, customDir)}\n` : "") +
    `  - ${defaultDir}\n` +
    `Generate the web target first, then try again.`,
  );
}

// ── dev server manager ──────────────────────────────────────────────

interface ServerInstance {
  process: ChildProcess;
  port: number;
  url: string;
}

const servers = new Map<string, ServerInstance>();

function ensureDepsInstalled(webDir: string): void {
  if (existsSync(join(webDir, "node_modules"))) return;
  try {
    execSync("npm install", { cwd: webDir, stdio: "pipe", timeout: 90_000 });
  } catch (err) {
    throw new Error(`Failed to install web app dependencies in ${webDir}: ${err instanceof Error ? err.message : err}`);
  }
}

async function startDevServer(webDir: string): Promise<ServerInstance> {
  const existing = servers.get(webDir);
  if (existing) {
    // Verify still running
    if (existing.process.exitCode === null) return existing;
    servers.delete(webDir);
  }

  ensureDepsInstalled(webDir);
  const port = await findFreePort();

  const child = spawn("npx", ["vite", "--port", String(port), "--strictPort"], {
    cwd: webDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0", BROWSER: "none" },
  });

  // Wait for "Local:" line from Vite
  const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

  const url = await new Promise<string>((resolveUrl, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Vite dev server failed to start within 30s"));
    }, 30_000);

    let output = "";
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      const clean = stripAnsi(output);
      const match = clean.match(/Local:\s+(https?:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        child.stdout?.off("data", onData);
        child.stderr?.off("data", onData);
        resolveUrl(match[1]);
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("error", (err) => { clearTimeout(timeout); reject(err); });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (!output.includes("Local:")) {
        reject(new Error(`Vite exited with code ${code} before ready. Output:\n${output.slice(-500)}`));
      }
    });
  });

  const instance: ServerInstance = { process: child, port, url };
  servers.set(webDir, instance);
  return instance;
}

// ── browser manager ─────────────────────────────────────────────────

let browserInstance: any = null;

async function getBrowser(): Promise<any> {
  if (browserInstance?.connected) return browserInstance;

  let puppeteer: any;
  try {
    puppeteer = await import("puppeteer");
  } catch {
    throw new Error(
      "puppeteer is not installed. Run:\n  npm install -g puppeteer\n" +
      "or add it to your project's devDependencies.",
    );
  }

  browserInstance = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return browserInstance;
}

// ── screenshot capture ──────────────────────────────────────────────

export async function takeScreenshot(
  projectCwd: string,
  options: ScreenshotOptions,
): Promise<ScreenshotResult> {
  const {
    route = "/",
    viewport = { width: 1280, height: 800 },
    theme,
    wait_for = 1000,
    full_page = false,
    selector,
  } = options;

  // 1. Find and start
  const webDir = findWebAppDir(projectCwd);
  const server = await startDevServer(webDir);
  const browser = await getBrowser();

  // 2. Navigate
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: viewport.width, height: viewport.height });

    if (theme) {
      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: theme },
      ]);
    }

    const base = server.url.replace(/\/+$/, "");
    const targetUrl = `${base}${route.startsWith("/") ? "" : "/"}${route}`;
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

    return {
      content: [
        { type: "image" as const, data: base64, mimeType: "image/png" },
        {
          type: "text" as const,
          text: JSON.stringify({
            route,
            url: targetUrl,
            viewport,
            theme: theme ?? "default",
            full_page,
            selector: selector ?? null,
          }, null, 2),
        },
      ],
    };
  } finally {
    await page.close();
  }
}

// ── cleanup ─────────────────────────────────────────────────────────

export function shutdownAll() {
  for (const [, instance] of servers) {
    try { instance.process.kill(); } catch { /* already dead */ }
  }
  servers.clear();
  if (browserInstance) {
    try { browserInstance.close(); } catch { /* ignore */ }
    browserInstance = null;
  }
}

process.on("exit", shutdownAll);
process.on("SIGINT", () => { shutdownAll(); process.exit(0); });
process.on("SIGTERM", () => { shutdownAll(); process.exit(0); });
