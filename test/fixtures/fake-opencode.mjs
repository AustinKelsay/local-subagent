#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
if (args[0] !== "run") {
  process.stderr.write(`unexpected args: ${JSON.stringify(args)}\n`);
  process.exit(9);
}

let model = null;
let index = 1;
if (args[index] === "--model") {
  model = args[index + 1] || null;
  index += 2;
}

const prompt = args[index] || "";

if (process.env.FAKE_OPENCODE_SLEEP_MS) {
  await new Promise((resolve) => setTimeout(resolve, Number.parseInt(process.env.FAKE_OPENCODE_SLEEP_MS, 10)));
}

if (process.env.FAKE_OPENCODE_WRITE_ARTIFACT) {
  await writeFile(process.env.FAKE_OPENCODE_WRITE_ARTIFACT, "runtime artifact\n", "utf8");
}

if (process.env.FAKE_OPENCODE_FAIL === "1") {
  process.stderr.write(`fake failure for model=${model ?? "none"}\n`);
  process.exit(17);
}

process.stdout.write(`fake-opencode ok\nmodel=${model ?? "none"}\n`);
process.stdout.write(prompt);
