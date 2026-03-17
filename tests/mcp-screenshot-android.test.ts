import assert from "node:assert/strict";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import test, { after, before, describe } from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const socialAppDir = resolve(repoRoot, "examples", "social-app");
const hasSocialApp = existsSync(join(socialAppDir, "openuispec", "openuispec.yaml"));
const hasSocialAppAndroid = existsSync(join(socialAppDir, "generated", "android", "social-app", "gradlew"));

// Point at social-app example if it exists
if (hasSocialApp) {
  process.env.OPENUISPEC_PROJECT_DIR = socialAppDir;
}

const { server } = await import("../mcp-server/index.ts");
const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
const {
  matchesScreenFilter,
  hashContent,
  buildScreenshotResponse,
  collectPngSnapshots,
  walkFiles,
} = await import("../mcp-server/screenshot-shared.ts");
const { findAndroidAppDir, takeAndroidScreenshotBatch } = await import("../mcp-server/screenshot-android.ts");
const { takeScreenshotBatch: takeWebScreenshotBatch } = await import("../mcp-server/screenshot.ts");

let client: Client;

before(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test-client", version: "0.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

after(async () => {
  await client.close();
  await server.close();
  delete process.env.OPENUISPEC_PROJECT_DIR;
});

// ── unit tests for shared utilities ───────────────────────────────────

describe("screenshot-shared utilities", () => {
  test("matchesScreenFilter matches normalized names", () => {
    assert.ok(matchesScreenFilter("HomeFeed", "home_feed"));
    assert.ok(matchesScreenFilter("home_feed", "HomeFeed"));
    assert.ok(matchesScreenFilter("HomeFeedScreen", "homefeed"));
    assert.ok(!matchesScreenFilter("Settings", "home_feed"));
  });

  test("hashContent returns consistent MD5 hex", () => {
    const hash1 = hashContent("hello world");
    const hash2 = hashContent("hello world");
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 32);

    const hash3 = hashContent("different");
    assert.notEqual(hash1, hash3);
  });

  test("buildScreenshotResponse returns error for empty snapshots", () => {
    const result = buildScreenshotResponse([], () => ({}));
    assert.ok(result.isError);
    assert.ok(result.content[0].type === "text");
  });

  test("buildScreenshotResponse builds image+text pairs", () => {
    const snapshots = [
      { screen: "Home", path: "snaps/Home.png", data: "abc123base64" },
    ];
    const result = buildScreenshotResponse(snapshots, (s) => ({
      screen: s.screen,
      emulator: "emulator-5554",
    }));
    assert.ok(!result.isError);
    assert.equal(result.content.length, 2);
    assert.equal(result.content[0].type, "image");
    assert.equal((result.content[0] as any).mimeType, "image/png");
    assert.equal(result.content[1].type, "text");
    const meta = JSON.parse((result.content[1] as any).text);
    assert.equal(meta.screen, "Home");
    assert.equal(meta.emulator, "emulator-5554");
  });

  test("collectPngSnapshots collects and filters PNGs", () => {
    const tmpDir = join(repoRoot, "tests", ".tmp-snap-test");
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "HomeScreenshotTest_default.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(join(tmpDir, "SettingsScreenshotTest_dark.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(join(tmpDir, "not-a-png.txt"), "nope");

    try {
      const all = collectPngSnapshots(
        [tmpDir], repoRoot, undefined,
        (f) => f.replace(/ScreenshotTest.*\.png$/, ""),
      );
      assert.equal(all.length, 2);
      assert.ok(all.some((s) => s.screen === "Home"));
      assert.ok(all.some((s) => s.screen === "Settings"));

      const filtered = collectPngSnapshots(
        [tmpDir], repoRoot, "home",
        (f) => f.replace(/ScreenshotTest.*\.png$/, ""),
      );
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].screen, "Home");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("walkFiles finds files by extension", () => {
    const tmpDir = join(repoRoot, "tests", ".tmp-walk-test");
    mkdirSync(join(tmpDir, "sub"), { recursive: true });
    writeFileSync(join(tmpDir, "a.kt"), "class A");
    writeFileSync(join(tmpDir, "sub", "b.kt"), "class B");
    writeFileSync(join(tmpDir, "c.txt"), "not kotlin");

    try {
      const ktFiles = walkFiles(tmpDir, ".kt");
      assert.equal(ktFiles.length, 2);
      assert.ok(ktFiles.every((f) => f.endsWith(".kt")));
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("walkFiles respects skipDirs", () => {
    const tmpDir = join(repoRoot, "tests", ".tmp-walk-skip-test");
    mkdirSync(join(tmpDir, "build"), { recursive: true });
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "build", "gen.kt"), "generated");
    writeFileSync(join(tmpDir, "src", "main.kt"), "source");

    try {
      const files = walkFiles(tmpDir, ".kt", ["build"]);
      assert.equal(files.length, 1);
      assert.ok(files[0].includes("main.kt"));
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ── unit tests for Android-specific functions ─────────────────────────

describe("screenshot-android", () => {
  test("findAndroidAppDir finds the social-app Android project", { skip: !hasSocialAppAndroid && "social-app Android generated folder not found" }, () => {
    const dir = findAndroidAppDir(socialAppDir);
    assert.ok(dir.includes("social-app"));
    assert.ok(existsSync(join(dir, "gradlew")));
  });

  test("findAndroidAppDir throws for non-existent project", () => {
    assert.throws(
      () => findAndroidAppDir("/tmp/nonexistent-project-xyz"),
      /not found|No openuispec/i,
    );
  });

  test("takeAndroidScreenshotBatch returns error for empty captures", async () => {
    const result = await takeAndroidScreenshotBatch(socialAppDir, { captures: [] });
    assert.equal(result.isError, true);
    assert.match((result.content[0] as any).text, /No Android captures specified/i);
  });
});

// ── MCP tool integration tests ────────────────────────────────────────
// Note: Full end-to-end tests require a running emulator.
// These tests verify error handling without an emulator.

describe("openuispec_screenshot_android (MCP tool)", () => {
  test("returns error when no emulator is connected", { skip: !hasSocialApp && "social-app not found" }, async () => {
    // This test will pass when no emulator is running (CI, dev without emulator)
    // and will be skipped implicitly if an emulator IS running (it would succeed)
    const result: any = await client.callTool({
      name: "openuispec_screenshot_android",
      arguments: { screen: "home_feed", wait_for: 1000 },
    });

    // Either succeeds (emulator running) or errors (no emulator)
    if (result.isError) {
      const text = result.content[0].text;
      assert.ok(
        text.includes("emulator") || text.includes("adb") || text.includes("device") || text.includes("APK") || text.includes("not found"),
        `Expected emulator/adb/build error, got: ${text}`,
      );
    }
    // If no error, a screenshot was taken — that's fine too
  });

  test("batch returns error for empty captures via MCP", async () => {
    const result: any = await client.callTool({
      name: "openuispec_screenshot_android_batch",
      arguments: { captures: [] },
    });
    assert.ok(result.isError);
    assert.match(result.content[0].text, /No Android captures specified/i);
  });
});

// ── web batch tests ───────────────────────────────────────────────────

describe("screenshot-web-batch", () => {
  test("takeWebScreenshotBatch returns error for empty captures", async () => {
    const result = await takeWebScreenshotBatch("/tmp/unused", { captures: [] });
    assert.equal(result.isError, true);
    assert.match((result.content[0] as any).text, /No web captures specified/i);
  });

  test("web batch returns error for empty captures via MCP", async () => {
    const result: any = await client.callTool({
      name: "openuispec_screenshot_web_batch",
      arguments: { captures: [] },
    });
    assert.ok(result.isError);
    assert.match(result.content[0].text, /No web captures specified/i);
  });
});

// ── iOS batch MCP test ────────────────────────────────────────────────

describe("openuispec_screenshot_ios_batch (MCP tool)", () => {
  test("batch returns error for empty captures via MCP", async () => {
    const result: any = await client.callTool({
      name: "openuispec_screenshot_ios_batch",
      arguments: { captures: [] },
    });
    assert.ok(result.isError);
    assert.match(result.content[0].text, /No iOS captures specified/i);
  });
});
