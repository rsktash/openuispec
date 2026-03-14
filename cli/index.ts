#!/usr/bin/env -S npx tsx
/**
 * OpenUISpec CLI
 *
 * Usage:
 *   openuispec init                           Create a new spec project
 *   openuispec drift [--target <t>]           Check for spec drift
 *   openuispec drift --snapshot --target <t>  Snapshot current state
 *   openuispec validate [group...]            Validate spec files against schemas
 */

import { init } from "./init.js";

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "init":
      await init();
      break;

    case "drift": {
      const { runDrift } = await import("../drift/index.js");
      runDrift(rest);
      break;
    }

    case "validate": {
      const { runValidate } = await import("../schema/validate.js");
      runValidate(rest);
      break;
    }

    case undefined:
    case "--help":
    case "-h":
      console.log(`
OpenUISpec CLI v0.1

Usage:
  openuispec init                           Create a new spec project
  openuispec drift [--target <t>]           Check for spec drift
  openuispec drift --snapshot --target <t>  Snapshot current state
  openuispec validate [group...]            Validate spec files

Validate groups: manifest, tokens, screens, flows, platform, locales, contracts

Docs: https://openuispec.rsteam.uz
`);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error(`Run "openuispec --help" for usage.`);
      process.exit(1);
  }
}

main();
