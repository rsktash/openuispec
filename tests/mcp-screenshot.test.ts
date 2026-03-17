import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before, describe } from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Point at social-app example (uses real generated web app, not a sandbox)
process.env.OPENUISPEC_PROJECT_DIR = resolve(repoRoot, "examples", "social-app");

const { server } = await import("../mcp-server/index.ts");
const { shutdownAll } = await import("../mcp-server/screenshot.ts");
const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");

let client: Client;

before(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test-client", version: "0.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

after(async () => {
  shutdownAll();
  await client.close();
  await server.close();
  delete process.env.OPENUISPEC_PROJECT_DIR;
});

describe("openuispec_screenshot", () => {
  test("captures the home page and returns a PNG image", async () => {
    const result: any = await client.callTool({
      name: "openuispec_screenshot",
      arguments: { route: "/home", wait_for: 2000 },
    });

    assert.ok(!result.isError, `expected no error, got: ${result.content?.[0]?.text}`);
    assert.equal(result.content.length, 2, "should return image + metadata");

    const image = result.content[0];
    assert.equal(image.type, "image");
    assert.equal(image.mimeType, "image/png");
    assert.ok(image.data.length > 100, "base64 data should be non-trivial");

    const meta = JSON.parse(result.content[1].text);
    assert.equal(meta.route, "/home");
    assert.equal(meta.viewport.width, 1280);
    assert.equal(meta.viewport.height, 800);
  });

  test("captures with mobile viewport", async () => {
    const result: any = await client.callTool({
      name: "openuispec_screenshot",
      arguments: { route: "/home", viewport: { width: 375, height: 812 }, wait_for: 1500 },
    });

    assert.ok(!result.isError, `expected no error, got: ${result.content?.[0]?.text}`);
    const meta = JSON.parse(result.content[1].text);
    assert.equal(meta.viewport.width, 375);
    assert.equal(meta.viewport.height, 812);
  });

  test("captures with dark theme", async () => {
    const result: any = await client.callTool({
      name: "openuispec_screenshot",
      arguments: { route: "/settings", theme: "dark", wait_for: 1500 },
    });

    assert.ok(!result.isError, `expected no error, got: ${result.content?.[0]?.text}`);
    const meta = JSON.parse(result.content[1].text);
    assert.equal(meta.theme, "dark");
    assert.equal(meta.route, "/settings");
  });

  test("captures full page", async () => {
    const result: any = await client.callTool({
      name: "openuispec_screenshot",
      arguments: { route: "/home", full_page: true, wait_for: 1500 },
    });

    assert.ok(!result.isError, `expected no error, got: ${result.content?.[0]?.text}`);
    const meta = JSON.parse(result.content[1].text);
    assert.equal(meta.full_page, true);
  });

  test("returns error for invalid selector", async () => {
    const result: any = await client.callTool({
      name: "openuispec_screenshot",
      arguments: { route: "/home", selector: "#nonexistent-element-xyz", wait_for: 1500 },
    });

    assert.ok(result.isError, "should be an error for missing selector");
    assert.ok(result.content[0].text.includes("not found"), "should mention element not found");
  });
});
