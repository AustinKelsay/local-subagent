#!/usr/bin/env node

const args = process.argv.slice(2);
if (args[0] !== "run") {
  process.stderr.write(`unexpected args: ${JSON.stringify(args)}\n`);
  process.exit(9);
}

let model = null;
let provider = null;
let prompt = null;
let system = null;
let recipe = null;
const params = [];
let builtins = null;
let maxTurns = null;
let maxToolRepetitions = null;

for (let index = 1; index < args.length; index += 1) {
  if (args[index] === "--text") {
    prompt = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (args[index] === "--model") {
    model = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (args[index] === "--provider") {
    provider = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (args[index] === "--system") {
    system = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (args[index] === "--recipe") {
    recipe = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (args[index] === "--params") {
    params.push(args[index + 1] || "");
    index += 1;
    continue;
  }
  if (args[index] === "--with-builtin") {
    builtins = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (args[index] === "--max-turns") {
    maxTurns = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (args[index] === "--max-tool-repetitions") {
    maxToolRepetitions = args[index + 1] || null;
    index += 1;
  }
}

if (!prompt) {
  process.stderr.write(`missing --text in args: ${JSON.stringify(args)}\n`);
  process.exit(10);
}

process.stdout.write(`fake-goose ok\nprovider=${provider ?? "none"}\nmodel=${model ?? "none"}\n`);
process.stdout.write(`system=${system ?? "none"}\n`);
process.stdout.write(`recipe=${recipe ?? "none"}\n`);
process.stdout.write(`params=${params.join(",") || "none"}\n`);
process.stdout.write(`builtins=${builtins ?? "none"}\n`);
process.stdout.write(`maxTurns=${maxTurns ?? "none"}\n`);
process.stdout.write(`maxToolRepetitions=${maxToolRepetitions ?? "none"}\n`);
process.stdout.write(prompt);
