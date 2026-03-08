import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

export function createJobPaths(outDir) {
  return {
    outDir,
    statusPath: path.join(outDir, "status.json"),
    stdoutPath: path.join(outDir, "stdout.log"),
    stderrPath: path.join(outDir, "stderr.log"),
    finalPath: path.join(outDir, "final.md"),
    cancelPath: path.join(outDir, "cancel-request.json"),
    cancelAckPath: path.join(outDir, "cancelled.json"),
  };
}

export async function ensureJobDir(outDir) {
  await mkdir(outDir, { recursive: true });
}

export async function writeStatus(statusPath, status) {
  await writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
}

export async function writeFinalMarkdown(finalPath, markdown) {
  const finalText = markdown.endsWith("\n") ? markdown : `${markdown}\n`;
  await writeFile(finalPath, finalText, "utf8");
}

export async function writeCancellationAck(cancelAckPath, payload) {
  await writeFile(cancelAckPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function buildFinalMarkdown({
  runtime,
  state,
  commandLine,
  stdoutText,
  stderrText,
  timedOut,
  cancelled,
  errorCode,
  errorDetail,
}) {
  if (state === "completed" && stdoutText.trim()) {
    return stdoutText.trimEnd();
  }

  const lines = [
    "# Host Subagent Result",
    "",
    `- Runtime: ${runtime}`,
    `- State: ${state}`,
    `- Timed out: ${timedOut ? "yes" : "no"}`,
    `- Cancelled: ${cancelled ? "yes" : "no"}`,
    `- Error code: ${errorCode ?? "none"}`,
    `- Command: \`${commandLine}\``,
  ];

  if (errorDetail) {
    lines.push(`- Detail: ${errorDetail}`);
  }

  if (stdoutText.trim()) {
    lines.push("", "## Stdout", "", "```text", stdoutText.trimEnd(), "```");
  }

  if (stderrText.trim()) {
    lines.push("", "## Stderr", "", "```text", stderrText.trimEnd(), "```");
  }

  if (!stdoutText.trim() && !stderrText.trim()) {
    lines.push("", "_No runtime output captured._");
  }

  return lines.join("\n");
}
