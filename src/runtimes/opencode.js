import { defineRuntimeAdapter } from "./types.js";

function parsePrefixArgs(raw) {
  if (!raw) {
    return [];
  }

  let value;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error(`HOST_AGENT_OPENCODE_PREFIX_ARGS must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error("HOST_AGENT_OPENCODE_PREFIX_ARGS must be a JSON array of strings");
  }

  return value;
}

function buildPrompt({ cwd, outDir, taskText }) {
  return [
    "You are running as a host subagent for OpenClaw.",
    `Working directory: ${cwd}`,
    `Artifact directory: ${outDir}`,
    "Write any durable outputs into the artifact directory when the runtime supports it.",
    "Return the final user-facing summary in plain text.",
    "",
    "Task:",
    taskText.trim(),
  ].join("\n");
}

export const opencodeRuntime = defineRuntimeAdapter({
  id: "opencode",
  buildLaunchSpec(context) {
    const prefixArgs = parsePrefixArgs(context.env.HOST_AGENT_OPENCODE_PREFIX_ARGS);
    const command = context.env.HOST_AGENT_OPENCODE_BIN || "opencode";
    const args = [...prefixArgs, "run"];

    if (context.model) {
      args.push("--model", context.model);
    }

    args.push(buildPrompt(context));

    return { command, args };
  },
});
