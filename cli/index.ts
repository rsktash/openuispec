#!/usr/bin/env -S npx tsx
/**
 * OpenUISpec CLI
 *
 * Usage:
 *   openuispec init          # scaffold a new spec project
 *   openuispec drift         # check for spec drift (all targets)
 *   openuispec drift --target ios
 *   openuispec drift --snapshot --target ios
 */

import { init } from "./init.js";

async function main(): Promise<void> {
  const [command] = process.argv.slice(2);

  switch (command) {
    case "init":
      await init();
      break;

    case "drift":
      console.error("drift command coming soon — use npm run drift for now");
      process.exit(1);
      break;

    case undefined:
    case "--help":
    case "-h":
      console.log(`
OpenUISpec CLI v0.1

Usage:
  openuispec init                           Create a new spec project
  openuispec drift [--target <t>]           Check for spec drift
  openuispec drift --snapshot --target <t>  Snapshot current state

Learn more: https://github.com/anthropics/openuispec
`);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error(`Run "openuispec --help" for usage.`);
      process.exit(1);
  }
}

main();
