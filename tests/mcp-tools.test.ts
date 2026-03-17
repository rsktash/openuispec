import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before, describe } from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Create sandbox before module import so projectCwd picks it up
const sandbox = mkdtempSync(join(tmpdir(), "openuispec-mcp-"));
cpSync(
  join(repoRoot, "examples", "social-app", "openuispec"),
  join(sandbox, "openuispec"),
  { recursive: true },
);
mkdirSync(join(sandbox, "backend"), { recursive: true });
process.env.OPENUISPEC_PROJECT_DIR = sandbox;

// Now import — module reads OPENUISPEC_PROJECT_DIR at load time
const { server } = await import("../mcp-server/index.ts");
const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");

// ── helpers ─────────────────────────────────────────────────────────

let client: Client;

function parseToolText(result: any): any {
  return JSON.parse(result.content[0].text);
}

function getToolText(result: any): string {
  return result.content[0].text;
}

// ── connect ─────────────────────────────────────────────────────────

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
  rmSync(sandbox, { recursive: true, force: true });
});

// ── tests ───────────────────────────────────────────────────────────

describe("openuispec_get_screen", () => {
  test("returns screen content by name", async () => {
    const result = await client.callTool({ name: "openuispec_get_screen", arguments: { name: "home_feed" } });
    const parsed = parseToolText(result);
    assert.equal(parsed.name, "home_feed");
    assert.equal(parsed.path, "screens/home_feed.yaml");
    assert.ok(parsed.content.includes("home_feed"), "content should contain screen key");
  });

  test("returns error for nonexistent screen", async () => {
    const result = await client.callTool({ name: "openuispec_get_screen", arguments: { name: "nonexistent" } });
    assert.ok(result.isError, "should be an error");
    assert.ok(getToolText(result).includes("not found"));
  });
});

describe("openuispec_get_contract", () => {
  test("returns full contract", async () => {
    const result = await client.callTool({ name: "openuispec_get_contract", arguments: { name: "action_trigger" } });
    const parsed = parseToolText(result);
    assert.equal(parsed.name, "action_trigger");
    assert.equal(parsed.path, "contracts/action_trigger.yaml");
    assert.ok(parsed.content.includes("action_trigger"), "content should contain contract key");
    assert.ok(parsed.content.includes("variants"), "content should contain variants");
  });

  test("with variant returns only that variant definition", async () => {
    const result = await client.callTool({ name: "openuispec_get_contract", arguments: { name: "action_trigger", variant: "primary" } });
    const parsed = parseToolText(result);
    assert.equal(parsed.name, "action_trigger");
    assert.equal(parsed.variant, "primary");
    assert.ok(parsed.definition, "should have definition");
    assert.ok(parsed.definition.semantic, "variant should have semantic field");
    assert.equal(parsed.path, undefined, "variant response should not have path");
  });

  test("with nonexistent variant returns error listing available variants", async () => {
    const result = await client.callTool({ name: "openuispec_get_contract", arguments: { name: "action_trigger", variant: "nonexistent" } });
    assert.ok(result.isError, "should be an error");
    const text = getToolText(result);
    assert.ok(text.includes("not found"));
    assert.ok(text.includes("Available variants"), "should list available variants");
  });

  test("returns error for nonexistent contract", async () => {
    const result = await client.callTool({ name: "openuispec_get_contract", arguments: { name: "nonexistent" } });
    assert.ok(result.isError, "should be an error");
    assert.ok(getToolText(result).includes("not found"));
  });
});

describe("openuispec_get_tokens", () => {
  test("returns token file by category", async () => {
    const result = await client.callTool({ name: "openuispec_get_tokens", arguments: { category: "color" } });
    const parsed = parseToolText(result);
    assert.equal(parsed.category, "color");
    assert.equal(parsed.path, "tokens/color.yaml");
    assert.ok(parsed.content.includes("color"), "content should contain color key");
  });

  test("returns error for nonexistent category with available list", async () => {
    const result = await client.callTool({ name: "openuispec_get_tokens", arguments: { category: "nonexistent" } });
    assert.ok(result.isError, "should be an error");
    const text = getToolText(result);
    assert.ok(text.includes("not found"));
    assert.ok(text.includes("Available"), "should list available categories");
  });
});

describe("openuispec_get_locale", () => {
  test("returns full locale file", async () => {
    const result = await client.callTool({ name: "openuispec_get_locale", arguments: { locale: "en" } });
    const parsed = parseToolText(result);
    assert.equal(parsed.locale, "en");
    assert.equal(parsed.path, "locales/en.json");
    assert.ok(typeof parsed.content === "object", "content should be an object");
    assert.ok("nav.home" in parsed.content, "should contain nav.home key");
  });

  test("with keys filter returns only requested keys", async () => {
    const result = await client.callTool({ name: "openuispec_get_locale", arguments: { locale: "en", keys: ["nav.home", "nav.discover"] } });
    const parsed = parseToolText(result);
    assert.equal(parsed.locale, "en");
    const keys = Object.keys(parsed.content);
    assert.ok(keys.length <= 2, `should have at most 2 keys, got ${keys.length}`);
    assert.ok("nav.home" in parsed.content, "should contain nav.home");
    assert.ok("nav.discover" in parsed.content, "should contain nav.discover");
  });

  test("with keys filter omits missing keys silently", async () => {
    const result = await client.callTool({ name: "openuispec_get_locale", arguments: { locale: "en", keys: ["nav.home", "completely.fake.key"] } });
    const parsed = parseToolText(result);
    assert.ok("nav.home" in parsed.content, "should contain nav.home");
    assert.ok(!("completely.fake.key" in parsed.content), "should not contain fake key");
  });

  test("returns error for nonexistent locale with available list", async () => {
    const result = await client.callTool({ name: "openuispec_get_locale", arguments: { locale: "xx" } });
    assert.ok(result.isError, "should be an error");
    const text = getToolText(result);
    assert.ok(text.includes("not found"));
    assert.ok(text.includes("Available"), "should list available locales");
  });
});

describe("openuispec_check (scoped)", () => {
  test("without scope returns full audit mentioning multiple screens", async () => {
    const result = await client.callTool({ name: "openuispec_check", arguments: { target: "web" } });
    const auditText = result.content[1].text;
    assert.ok(auditText.includes("home_feed"), "full audit should include home_feed");
    assert.ok(auditText.includes("settings"), "full audit should include settings");
  });

  test("with screens scope filters audit to specified screens only", async () => {
    const result = await client.callTool({ name: "openuispec_check", arguments: { target: "web", screens: ["home_feed"] } });
    const auditText = result.content[1].text;
    assert.ok(auditText.includes("home_feed"), "scoped audit should include home_feed");
    assert.ok(!auditText.includes("### settings"), "scoped audit should not include settings screen heading");
  });

  test("with contracts scope filters audit to specified contracts only", async () => {
    const result = await client.callTool({ name: "openuispec_check", arguments: { target: "web", contracts: ["action_trigger"] } });
    const auditText = result.content[1].text;
    const contractSection = auditText.split("## Screens")[0];
    assert.ok(!contractSection.includes("### nav_container"), "scoped audit should not include nav_container in contract section");
  });

  test("audit includes explicit state-role token requirements when contracts declare them", async () => {
    const result = await client.callTool({ name: "openuispec_check", arguments: { target: "web", contracts: ["action_trigger"] } });
    const auditText = result.content[1].text;
    assert.ok(
      auditText.includes("Explicit state-role tokens are implemented for action_trigger.primary"),
      "audit should mention explicit state-role tokens for action_trigger.primary",
    );
    assert.ok(
      auditText.includes("states.disabled.text = color.text.tertiary"),
      "audit should include concrete state-role token entries",
    );
  });

  test("scoped audit still returns full validation results", async () => {
    const result = await client.callTool({ name: "openuispec_check", arguments: { target: "web", screens: ["home_feed"] } });
    const validation = JSON.parse(result.content[0].text);
    assert.equal(validation.target, "web");
    assert.equal(typeof validation.validation, "object", "should contain validation results");
  });
});
