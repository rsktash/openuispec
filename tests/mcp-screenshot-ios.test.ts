import assert from "node:assert/strict";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import test, { after, before, describe } from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const socialAppDir = resolve(repoRoot, "examples", "social-app");
const hasSocialApp = existsSync(join(socialAppDir, "openuispec", "openuispec.yaml"));

const todoOrbitIOSDir = resolve(repoRoot, "examples", "todo-orbit", "generated", "ios", "Todo Orbit");
const hasTodoOrbitIOS = existsSync(todoOrbitIOSDir) &&
  existsSync(join(todoOrbitIOSDir, "TodoOrbit.xcodeproj")) || existsSync(join(todoOrbitIOSDir, "project.yml"));

// Point at social-app example if it exists
if (hasSocialApp) {
  process.env.OPENUISPEC_PROJECT_DIR = socialAppDir;
}

const { server } = await import("../mcp-server/index.ts");
const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
const { findIOSAppDir } = await import("../mcp-server/screenshot-ios.ts");
const { walkFiles } = await import("../mcp-server/screenshot-shared.ts");

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

// ── unit tests for iOS-specific functions ─────────────────────────────

describe("screenshot-ios", () => {
  test("findIOSAppDir throws when no iOS app exists (social-app)", { skip: !hasSocialApp && "social-app not found" }, () => {
    // social-app only has android + web
    assert.throws(
      () => findIOSAppDir(socialAppDir),
      /not found/i,
    );
  });

  test("findIOSAppDir throws for non-existent project", () => {
    assert.throws(
      () => findIOSAppDir("/tmp/nonexistent-project-xyz"),
      /not found|No openuispec/i,
    );
  });
});

// ── #Preview regex tests ──────────────────────────────────────────────

describe("iOS #Preview regex", () => {
  const modernPreviewRegex = /#Preview(?:\s*\(\s*"([^"]+)"\s*\))?\s*\{/g;
  const legacyPreviewRegex = /struct\s+(\w+)\s*:\s*PreviewProvider/g;

  test("matches simple #Preview", () => {
    const code = `#Preview {\n    HomeView()\n}`;
    const match = modernPreviewRegex.exec(code);
    assert.ok(match);
    assert.equal(match![1], undefined); // unnamed
    modernPreviewRegex.lastIndex = 0;
  });

  test("matches named #Preview", () => {
    const code = `#Preview("Dark Mode") {\n    HomeView()\n}`;
    const match = modernPreviewRegex.exec(code);
    assert.ok(match);
    assert.equal(match![1], "Dark Mode");
    modernPreviewRegex.lastIndex = 0;
  });

  test("matches multiple #Preview in same file", () => {
    const code = `
#Preview("Light") {
    HomeView()
}

#Preview("Dark") {
    HomeView().preferredColorScheme(.dark)
}
`;
    const matches: (string | undefined)[] = [];
    let match;
    while ((match = modernPreviewRegex.exec(code)) !== null) {
      matches.push(match[1]);
    }
    assert.equal(matches.length, 2);
    assert.equal(matches[0], "Light");
    assert.equal(matches[1], "Dark");
    modernPreviewRegex.lastIndex = 0;
  });

  test("matches legacy PreviewProvider", () => {
    const code = `struct HomeView_Previews: PreviewProvider {\n    static var previews: some View { HomeView() }\n}`;
    const match = legacyPreviewRegex.exec(code);
    assert.ok(match);
    assert.equal(match![1], "HomeView_Previews");
    legacyPreviewRegex.lastIndex = 0;
  });

  test("does not match non-preview struct", () => {
    const code = `struct HomeView: View {\n    var body: some View { Text("Hi") }\n}`;
    const match = legacyPreviewRegex.exec(code);
    assert.equal(match, null);
    legacyPreviewRegex.lastIndex = 0;
  });
});

// ── preview file scanning tests ───────────────────────────────────────

describe("iOS preview file scanning", () => {
  const tmpDir = join(repoRoot, "tests", ".tmp-ios-scan-test");

  before(() => {
    mkdirSync(join(tmpDir, "sub"), { recursive: true });

    writeFileSync(join(tmpDir, "HomeView.swift"), `
import SwiftUI

struct HomeView: View {
    var body: some View { Text("Hello") }
}

#Preview {
    HomeView()
}
`);

    writeFileSync(join(tmpDir, "sub", "SettingsView.swift"), `
import SwiftUI

struct SettingsView: View {
    var body: some View { Text("Settings") }
}

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View { SettingsView() }
}
`);

    writeFileSync(join(tmpDir, "NoPreview.swift"), `
import SwiftUI

struct NoPreviewView: View {
    var body: some View { Text("No Preview") }
}
`);
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("walkFiles finds Swift files recursively", () => {
    const files = walkFiles(tmpDir, ".swift");
    assert.equal(files.length, 3);
    assert.ok(files.every((f) => f.endsWith(".swift")));
  });

  test("walkFiles skips excluded dirs", () => {
    const buildDir = join(tmpDir, "build");
    mkdirSync(buildDir, { recursive: true });
    writeFileSync(join(buildDir, "Generated.swift"), "// generated");

    try {
      const files = walkFiles(tmpDir, ".swift", ["build"]);
      assert.equal(files.length, 3); // should not include build/Generated.swift
      assert.ok(files.every((f) => !f.includes("/build/")));
    } finally {
      rmSync(buildDir, { recursive: true, force: true });
    }
  });
});

// ── MCP tool integration tests ────────────────────────────────────────

describe("openuispec_screenshot_ios (MCP tool)", () => {
  test("returns error for invalid device", { skip: !hasTodoOrbitIOS && "todo-orbit iOS generated folder not found" }, async () => {
    const result: any = await client.callTool({
      name: "openuispec_screenshot_ios",
      arguments: { device: "INVALID_DEVICE_XYZ", project_dir: todoOrbitIOSDir },
    });

    assert.ok(result.isError, "should be an error for invalid device");
    const text = result.content[0].text;
    assert.ok(
      text.includes("No simulator found") || text.includes("INVALID_DEVICE_XYZ"),
      `Expected simulator-not-found error, got: ${text}`,
    );
  });

  test("returns error when no iOS app found", { skip: !hasSocialApp && "social-app not found" }, async () => {
    // social-app has no iOS target
    const result: any = await client.callTool({
      name: "openuispec_screenshot_ios",
      arguments: {},
    });

    assert.ok(result.isError, "should error when no iOS app exists");
    assert.ok(result.content[0].text.includes("not found") || result.content[0].text.includes("iOS"));
  });
});
