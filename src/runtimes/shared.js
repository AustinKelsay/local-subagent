export function parsePrefixArgs(raw, envName) {
  if (!raw) {
    return [];
  }

  let value;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${envName} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${envName} must be a JSON array of strings`);
  }

  return value;
}

export function buildHostPrompt({ cwd, outDir, taskText }) {
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
