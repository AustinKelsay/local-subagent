import os from "node:os";
import path from "node:path";

const supportedIntentIds = new Set(["desktop_listing", "inspect_path", "repo_summary"]);

function compactBlock(text) {
  return text.trim();
}

function joinSections(parts) {
  return parts.filter(Boolean).join("\n\n");
}

function ensureIntent(intent) {
  if (!intent || !supportedIntentIds.has(intent)) {
    throw new Error(
      `Unsupported intent "${intent}". Supported intents: ${Array.from(supportedIntentIds).join(", ")}`,
    );
  }
}

function buildDesktopListingTask({ targetPath, operatorNotes }) {
  return joinSections([
    [
      "Resolve the real Desktop directory for the current host user from the host environment.",
      `Inspect the real host directory at ${targetPath}.`,
      "List the top-level entries only.",
      "Then provide a concise summary of what is on the Desktop.",
      "Use host tools to verify the result directly.",
    ].join("\n"),
    operatorNotes ? `Operator notes:\n${operatorNotes}` : null,
  ]);
}

function buildInspectPathTask({ targetPath, operatorNotes }) {
  return joinSections([
    [
      `Inspect the real host path at ${targetPath}.`,
      "Gather the relevant facts directly from the filesystem or available host tools.",
      "Return a concise user-facing summary of what is there.",
    ].join("\n"),
    operatorNotes ? `Operator notes:\n${operatorNotes}` : null,
  ]);
}

function buildRepoSummaryTask({ targetPath, operatorNotes }) {
  return joinSections([
    [
      `Inspect the repository at ${targetPath}.`,
      "Identify the top-level structure, likely entrypoints, and any obvious build or test commands.",
      "Return a concise repository summary grounded in direct inspection.",
    ].join("\n"),
    operatorNotes ? `Operator notes:\n${operatorNotes}` : null,
  ]);
}

export function listIntentIds() {
  return Array.from(supportedIntentIds);
}

export function resolveExecutionRequest({ runtime, intent, cwd, targetPath, taskText, requestedModel }) {
  if (runtime) {
    return {
      inputMode: "runtime",
      runtime,
      cwd,
      taskText: compactBlock(taskText),
      model: requestedModel ?? null,
      intent: null,
      targetPath: targetPath ?? null,
      requestedModel: requestedModel ?? null,
    };
  }

  ensureIntent(intent);

  const resolvedTargetPath =
    intent === "desktop_listing"
      ? path.resolve(targetPath || path.join(os.homedir(), "Desktop"))
      : path.resolve(targetPath || cwd);
  const operatorNotes = taskText?.trim() ? compactBlock(taskText) : null;

  if (intent === "desktop_listing") {
    return {
      inputMode: "intent",
      runtime: "goose",
      cwd,
      taskText: buildDesktopListingTask({ targetPath: resolvedTargetPath, operatorNotes }),
      model: requestedModel ?? null,
      intent,
      targetPath: resolvedTargetPath,
      requestedModel: requestedModel ?? null,
    };
  }

  if (intent === "inspect_path") {
    return {
      inputMode: "intent",
      runtime: "goose",
      cwd,
      taskText: buildInspectPathTask({ targetPath: resolvedTargetPath, operatorNotes }),
      model: requestedModel ?? null,
      intent,
      targetPath: resolvedTargetPath,
      requestedModel: requestedModel ?? null,
    };
  }

  return {
    inputMode: "intent",
    runtime: "goose",
    cwd,
    taskText: buildRepoSummaryTask({ targetPath: resolvedTargetPath, operatorNotes }),
    model: requestedModel ?? null,
    intent,
    targetPath: resolvedTargetPath,
    requestedModel: requestedModel ?? null,
  };
}
