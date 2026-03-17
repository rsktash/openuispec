import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

type ImageContent = {
  type: "image";
  data: string;
  mimeType: string;
};

type TextContent = {
  type: "text";
  text: string;
};

type WebCapture = {
  name: string;
  route: string;
};

const OUTPUT_DIR = resolve("generated/web/social-app/screenshots");
const VIEWPORT = { width: 1366, height: 900 };
const captures: WebCapture[] = [
  { name: "home", route: "/home" },
  { name: "discover", route: "/discover" },
  { name: "notifications", route: "/notifications" },
  { name: "messages", route: "/messages" },
  { name: "profile", route: "/profile" },
  { name: "profile-edit", route: "/profile/edit" },
  { name: "settings", route: "/settings" },
  { name: "create", route: "/create" },
  { name: "search-editorial-ui-posts", route: "/search?query=Editorial%20UI&tab=posts" },
  { name: "post-post-1", route: "/posts/post-1" },
  { name: "user-lina", route: "/u/user-lina" },
  { name: "chat-conversation-1", route: "/chat/conversation-1" },
];

function getImageData(content: Array<ImageContent | TextContent>): string {
  const image = content.find((item): item is ImageContent => item.type === "image");
  if (!image) {
    throw new Error("Screenshot tool did not return image data.");
  }
  return image.data;
}

function getText(content: Array<ImageContent | TextContent>): string | null {
  const text = content.find((item): item is TextContent => item.type === "text");
  return text?.text ?? null;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const transport = new StdioClientTransport({
    command: "npm",
    args: ["run", "openuispec", "--", "mcp"],
    cwd: process.cwd(),
    stderr: "inherit",
  });

  const client = new Client(
    { name: "social-app-screenshot-runner", version: "0.1.0" },
    { capabilities: {} },
  );

  await client.connect(transport);

  try {
    for (const capture of captures) {
      const result = await client.callTool({
        name: "openuispec_screenshot",
        arguments: {
          route: capture.route,
          viewport: VIEWPORT,
          wait_for: 1200,
          full_page: true,
        },
      });

      if (result.isError) {
        throw new Error(`Failed to capture ${capture.route}: ${getText(result.content as Array<ImageContent | TextContent>) ?? "Unknown tool error"}`);
      }

      const outputPath = join(OUTPUT_DIR, `${capture.name}.png`);
      writeFileSync(outputPath, Buffer.from(getImageData(result.content as Array<ImageContent | TextContent>), "base64"));
      console.log(`saved ${outputPath}`);
    }
  } finally {
    await transport.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
