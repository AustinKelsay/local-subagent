#!/usr/bin/env node

const args = process.argv.slice(2);
if (args[0] !== "run" || args.length < 3) {
  process.stderr.write(`unexpected args: ${JSON.stringify(args)}\n`);
  process.exit(9);
}

const [, model, prompt] = args;
process.stdout.write(`fake-ollama ok\nmodel=${model}\n`);
process.stdout.write(prompt);
