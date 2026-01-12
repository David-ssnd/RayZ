#!/usr/bin/env node

/**
 * Protocol Validator Script
 *
 * This script validates that both the C++ firmware headers and TypeScript types
 * match the protocol definition in protocol_def.json
 *
 * Usage: node scripts/validate-protocol.js
 */

const fs = require("fs");
const path = require("path");

const PROTOCOL_DEF_PATH = path.join(__dirname, "..", "protocol_def.json");
const TYPESCRIPT_PROTOCOL_PATH = path.join(
  __dirname,
  "..",
  "web",
  "packages",
  "types",
  "src",
  "protocol.ts"
);

let hasErrors = false;

function logError(message) {
  console.error(`❌ ERROR: ${message}`);
  hasErrors = true;
}

function logWarning(message) {
  console.warn(`⚠️  WARNING: ${message}`);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

try {
  const protocolDef = JSON.parse(fs.readFileSync(PROTOCOL_DEF_PATH, "utf8"));
  const tsProtocolContent = fs.readFileSync(TYPESCRIPT_PROTOCOL_PATH, "utf8");

  console.log("\n=== Protocol Validation ===\n");

  // Check OpCode enum
  console.log("Validating OpCode enum...");
  const opCodeDef = protocolDef.enums.OpCode.values;

  for (const [name, value] of Object.entries(opCodeDef)) {
    const pattern = new RegExp(`${name}\\s*=\\s*${value}`);
    if (!pattern.test(tsProtocolContent)) {
      logError(`OpCode.${name} = ${value} not found in TypeScript protocol`);
    }
  }

  if (!hasErrors) {
    logSuccess("All OpCode values match");
  }

  // Check GameCommandType enum
  console.log("\nValidating GameCommandType enum...");
  const gameCommandDef = protocolDef.enums.GameCommandType.values;

  for (const [name, value] of Object.entries(gameCommandDef)) {
    const pattern = new RegExp(`${name}\\s*=\\s*${value}`);
    if (!pattern.test(tsProtocolContent)) {
      logError(
        `GameCommandType.${name} = ${value} not found in TypeScript protocol`
      );
    }
  }

  if (!hasErrors) {
    logSuccess("All GameCommandType values match");
  }

  console.log("\n=== Validation Summary ===");

  if (!hasErrors) {
    console.log("\n✅ All validations passed!");
    process.exit(0);
  } else {
    console.log("\n❌ Validation failed with errors.");
    process.exit(1);
  }
} catch (error) {
  console.error("Failed to validate protocol:", error.message);
  process.exit(1);
}
