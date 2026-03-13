/**
 * Emits Package.swift for the generated Swift package.
 */

import type { IR } from "../ir/types.js";

export function emitPackageSwift(ir: IR): string {
  return `// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "${ir.projectName}",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    targets: [
        .executableTarget(
            name: "${ir.projectName}",
            path: "Sources",
            resources: [.process("Resources")]
        )
    ]
)
`;
}
