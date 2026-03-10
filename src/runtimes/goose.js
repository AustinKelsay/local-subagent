import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineRuntimeAdapter } from "./types.js";
import { buildHostPrompt, parsePrefixArgs } from "./shared.js";

const bundledRecipePath = fileURLToPath(new URL("../../recipes/goose-host-inspector.yaml", import.meta.url));

function parseOptionalPositiveInt(rawValue, envName) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return null;
  }

  const numeric = Number.parseInt(String(rawValue), 10);
  if (!Number.isFinite(numeric) || numeric < 1) {
    throw new Error(`${envName} must be a positive integer`);
  }

  return numeric;
}

function parseGooseBuiltins(rawValue) {
  if (rawValue === undefined) {
    return ["developer"];
  }

  if (!rawValue || !rawValue.trim()) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch (error) {
    throw new Error(
      `HOST_AGENT_GOOSE_BUILTINS must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== "string" || !entry.trim())) {
    throw new Error("HOST_AGENT_GOOSE_BUILTINS must be a JSON array of non-empty strings");
  }

  return parsed.map((entry) => entry.trim());
}

function parseGooseRecipeParams(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch (error) {
    throw new Error(
      `HOST_AGENT_GOOSE_RECIPE_PARAMS must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (Array.isArray(parsed)) {
    if (parsed.some((entry) => typeof entry !== "string" || !entry.includes("="))) {
      throw new Error("HOST_AGENT_GOOSE_RECIPE_PARAMS array entries must be strings in KEY=VALUE form");
    }
    return parsed;
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("HOST_AGENT_GOOSE_RECIPE_PARAMS must be a JSON object or array");
  }

  return Object.entries(parsed).map(([key, value]) => `${key}=${String(value)}`);
}

function buildGooseSystemPrompt(context) {
  return [
    "You are a host-side Goose agent running for OpenClaw.",
    "Your role is to inspect the real host machine, gather facts, and return a truthful answer.",
    "You have permission to spend time investigating with the available developer tools before you answer.",
    `Use the real host working directory as your stable launch point: ${context.cwd}`,
    `Use the artifact directory for durable outputs when needed: ${context.outDir}`,
    "Prefer direct tool use over speculation.",
    "If the task requires filesystem facts, inspect them directly with the available developer tools.",
    "Resolve user-facing locations like Desktop from the host environment instead of trusting guessed usernames.",
    "If you cannot verify something from the host, say so plainly.",
    "Return the final user-facing answer in plain text.",
  ].join("\n");
}

function buildRecipeContext(recipe, recipeParams) {
  const sections = [];

  if (recipe) {
    sections.push(`Recipe template: ${recipe}`);
  }

  if (recipeParams.length > 0) {
    sections.push(`Recipe parameters: ${recipeParams.join(", ")}`);
  }

  return sections.join("\n");
}

function resolveGooseRecipe(rawValue) {
  const trimmed = rawValue?.trim();
  if (trimmed) {
    if (trimmed === "off" || trimmed === "none") {
      return null;
    }
    return trimmed;
  }

  return existsSync(bundledRecipePath) ? bundledRecipePath : null;
}

export const gooseRuntime = defineRuntimeAdapter({
  id: "goose",
  buildLaunchSpec(context) {
    const prefixArgs = parsePrefixArgs(context.env.HOST_AGENT_GOOSE_PREFIX_ARGS, "HOST_AGENT_GOOSE_PREFIX_ARGS");
    const command = context.env.HOST_AGENT_GOOSE_BIN || "goose";
    const prompt = buildHostPrompt(context);
    const args = [...prefixArgs, "run", "--quiet", "--no-session"];
    const provider = context.env.HOST_AGENT_GOOSE_PROVIDER || (context.model ? "ollama" : undefined);
    const builtins = parseGooseBuiltins(context.env.HOST_AGENT_GOOSE_BUILTINS);
    const recipe = resolveGooseRecipe(context.env.HOST_AGENT_GOOSE_RECIPE);
    const recipeParams = parseGooseRecipeParams(context.env.HOST_AGENT_GOOSE_RECIPE_PARAMS);
    const recipeContext = buildRecipeContext(recipe, recipeParams);
    const systemPrompt =
      context.env.HOST_AGENT_GOOSE_SYSTEM_PROMPT?.trim() ||
      [buildGooseSystemPrompt(context), recipeContext].filter(Boolean).join("\n");
    const maxTurns = parseOptionalPositiveInt(context.env.HOST_AGENT_GOOSE_MAX_TURNS, "HOST_AGENT_GOOSE_MAX_TURNS");
    const maxToolRepetitions = parseOptionalPositiveInt(
      context.env.HOST_AGENT_GOOSE_MAX_TOOL_REPETITIONS,
      "HOST_AGENT_GOOSE_MAX_TOOL_REPETITIONS",
    );

    if (provider) {
      args.push("--provider", provider);
    }

    if (context.model) {
      args.push("--model", context.model);
    }

    if (systemPrompt) {
      args.push("--system", systemPrompt);
    }
    args.push("--text", prompt);

    if (builtins.length > 0) {
      args.push("--with-builtin", builtins.join(","));
    }

    if (maxTurns) {
      args.push("--max-turns", String(maxTurns));
    }

    if (maxToolRepetitions) {
      args.push("--max-tool-repetitions", String(maxToolRepetitions));
    }

    return {
      command,
      args,
    };
  },
});
