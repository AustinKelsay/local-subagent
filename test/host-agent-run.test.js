import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { main } from "../src/cli/host-agent-run.js";

async function makeJob() {
  const root = await mkdtemp(path.join(os.tmpdir(), "local-subagent-"));
  const cwd = path.join(root, "repo");
  const outDir = path.join(root, "job-123");
  const taskFile = path.join(outDir, "task.md");

  await mkdir(cwd, { recursive: true });
  await mkdir(outDir, { recursive: true });
  await writeFile(taskFile, "Inspect the repo and summarize the result.\n", "utf8");

  return { root, cwd, outDir, taskFile };
}

function buildEnv(overrides = {}) {
  return {
    ...process.env,
    HOST_AGENT_OPENCODE_BIN: process.execPath,
    HOST_AGENT_OPENCODE_PREFIX_ARGS: JSON.stringify([
      path.resolve("test/fixtures/fake-opencode.mjs"),
    ]),
    ...overrides,
  };
}

test("host-agent-run writes normalized completed artifacts", async () => {
  const job = await makeJob();
  const artifactPath = path.join(job.outDir, "artifact.txt");

  const result = await main(
    [
      "--runtime",
      "opencode",
      "--cwd",
      job.cwd,
      "--task-file",
      job.taskFile,
      "--out-dir",
      job.outDir,
      "--model",
      "claude-opus-4-6",
      "--timeout-seconds",
      "10",
    ],
    {
      env: buildEnv({
        FAKE_OPENCODE_WRITE_ARTIFACT: artifactPath,
      }),
    },
  );

  assert.equal(result.state, "completed");

  const status = JSON.parse(await readFile(path.join(job.outDir, "status.json"), "utf8"));
  const stdout = await readFile(path.join(job.outDir, "stdout.log"), "utf8");
  const finalText = await readFile(path.join(job.outDir, "final.md"), "utf8");
  const artifact = await readFile(artifactPath, "utf8");

  assert.equal(status.state, "completed");
  assert.equal(status.runtime, "opencode");
  assert.equal(status.model, "claude-opus-4-6");
  assert.equal(status.finalPath, path.join(job.outDir, "final.md"));
  assert.match(stdout, /fake-opencode ok/);
  assert.match(finalText, /Inspect the repo and summarize the result\./);
  assert.equal(artifact, "runtime artifact\n");
});

test("host-agent-run accepts request.json input", async () => {
  const job = await makeJob();
  const requestFile = path.join(job.outDir, "request.json");

  await writeFile(
    requestFile,
    `${JSON.stringify(
      {
        jobId: "job-from-request",
        runtime: "opencode",
        cwd: job.cwd,
        taskFile: job.taskFile,
        outDir: job.outDir,
        model: "claude-sonnet",
        timeoutSeconds: 10,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const result = await main(["--request-file", requestFile], {
    env: buildEnv(),
  });

  assert.equal(result.state, "completed");
  const status = JSON.parse(await readFile(path.join(job.outDir, "status.json"), "utf8"));
  assert.equal(status.jobId, "job-from-request");
  assert.equal(status.model, "claude-sonnet");
  assert.equal(status.requestFile, requestFile);
});

test("host-agent-run rejects unknown runtimes", async () => {
  const job = await makeJob();

  await assert.rejects(
    () =>
      main(
        [
          "--runtime",
          "goose",
          "--cwd",
          job.cwd,
          "--task-file",
          job.taskFile,
          "--out-dir",
          job.outDir,
        ],
        { env: buildEnv() },
      ),
    /Unsupported runtime "goose"/,
  );
});

test("host-agent-run marks timed out jobs", async () => {
  const job = await makeJob();

  await assert.rejects(
    () =>
      main(
        [
          "--runtime",
          "opencode",
          "--cwd",
          job.cwd,
          "--task-file",
          job.taskFile,
          "--out-dir",
          job.outDir,
          "--timeout-seconds",
          "1",
        ],
        {
          env: buildEnv({
            FAKE_OPENCODE_SLEEP_MS: "3000",
          }),
        },
      ),
    /state=timed_out/,
  );

  const status = JSON.parse(await readFile(path.join(job.outDir, "status.json"), "utf8"));
  const finalText = await readFile(path.join(job.outDir, "final.md"), "utf8");

  assert.equal(status.state, "timed_out");
  assert.match(finalText, /Timed out: yes/);
});
