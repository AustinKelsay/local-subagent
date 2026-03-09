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

function buildRuntimeEnv(runtime, overrides = {}) {
  const base = {
    ...process.env,
  };

  if (runtime === "opencode") {
    base.HOST_AGENT_OPENCODE_BIN = process.execPath;
    base.HOST_AGENT_OPENCODE_PREFIX_ARGS = JSON.stringify([path.resolve("test/fixtures/fake-opencode.mjs")]);
  }

  if (runtime === "ollama") {
    base.HOST_AGENT_OLLAMA_BIN = process.execPath;
    base.HOST_AGENT_OLLAMA_PREFIX_ARGS = JSON.stringify([path.resolve("test/fixtures/fake-ollama.mjs")]);
  }

  if (runtime === "goose") {
    base.HOST_AGENT_GOOSE_BIN = process.execPath;
    base.HOST_AGENT_GOOSE_PREFIX_ARGS = JSON.stringify([path.resolve("test/fixtures/fake-goose.mjs")]);
  }

  return {
    ...base,
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
      env: buildRuntimeEnv("opencode", {
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
    env: buildRuntimeEnv("opencode"),
  });

  assert.equal(result.state, "completed");
  const status = JSON.parse(await readFile(path.join(job.outDir, "status.json"), "utf8"));
  assert.equal(status.jobId, "job-from-request");
  assert.equal(status.model, "claude-sonnet");
  assert.equal(status.requestFile, requestFile);
});

test("host-agent-run accepts request.json with null timeoutSeconds", async () => {
  const job = await makeJob();
  const requestFile = path.join(job.outDir, "request.json");

  await writeFile(
    requestFile,
    `${JSON.stringify(
      {
        jobId: "job-from-request-null-timeout",
        runtime: "opencode",
        cwd: job.cwd,
        taskFile: job.taskFile,
        outDir: job.outDir,
        model: "claude-sonnet",
        timeoutSeconds: null,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const result = await main(["--request-file", requestFile], {
    env: buildRuntimeEnv("opencode"),
  });

  assert.equal(result.state, "completed");
  const status = JSON.parse(await readFile(path.join(job.outDir, "status.json"), "utf8"));
  assert.equal(status.jobId, "job-from-request-null-timeout");
  assert.equal(status.timeoutSeconds, null);
});

test("host-agent-run rejects unknown runtimes", async () => {
  const job = await makeJob();

  await assert.rejects(
    () =>
      main(
        [
          "--runtime",
          "unknown-runtime",
          "--cwd",
          job.cwd,
          "--task-file",
          job.taskFile,
          "--out-dir",
          job.outDir,
        ],
        { env: buildRuntimeEnv("opencode") },
      ),
    /Unsupported runtime "unknown-runtime"/,
  );
});

test("host-agent-run supports ollama runtime", async () => {
  const job = await makeJob();

  const result = await main(
    [
      "--runtime",
      "ollama",
      "--cwd",
      job.cwd,
      "--task-file",
      job.taskFile,
      "--out-dir",
      job.outDir,
      "--model",
      "llama3.2",
    ],
    {
      env: buildRuntimeEnv("ollama"),
    },
  );

  assert.equal(result.state, "completed");
  const stdout = await readFile(path.join(job.outDir, "stdout.log"), "utf8");
  assert.match(stdout, /fake-ollama ok/);
  assert.match(stdout, /model=llama3.2/);
});

test("host-agent-run supports goose runtime", async () => {
  const job = await makeJob();

  const result = await main(
    [
      "--runtime",
      "goose",
      "--cwd",
      job.cwd,
      "--task-file",
      job.taskFile,
      "--out-dir",
      job.outDir,
      "--model",
      "gpt-4.1",
    ],
    {
      env: buildRuntimeEnv("goose", {
        HOST_AGENT_GOOSE_PROVIDER: "openai",
      }),
    },
  );

  assert.equal(result.state, "completed");
  const stdout = await readFile(path.join(job.outDir, "stdout.log"), "utf8");
  assert.match(stdout, /fake-goose ok/);
  assert.match(stdout, /provider=openai/);
  assert.match(stdout, /model=gpt-4.1/);
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
          env: buildRuntimeEnv("opencode", {
            FAKE_OPENCODE_SLEEP_MS: "3000",
          }),
        },
      ),
    /state=timed_out/,
  );

  const status = JSON.parse(await readFile(path.join(job.outDir, "status.json"), "utf8"));
  const finalText = await readFile(path.join(job.outDir, "final.md"), "utf8");

  assert.equal(status.state, "timed_out");
  assert.equal(status.errorCode, "JOB_TIMEOUT");
  assert.match(finalText, /Timed out: yes/);
});

test("host-agent-run cancels when cancel marker is created", async () => {
  const job = await makeJob();
  const cancelPath = path.join(job.outDir, "cancel-request.json");

  const runPromise = main(
    [
      "--runtime",
      "opencode",
      "--cwd",
      job.cwd,
      "--task-file",
      job.taskFile,
      "--out-dir",
      job.outDir,
    ],
    {
      env: buildRuntimeEnv("opencode", {
        FAKE_OPENCODE_SLEEP_MS: "3000",
      }),
    },
  );

  setTimeout(async () => {
    await writeFile(
      cancelPath,
      `${JSON.stringify(
        {
          requestedAt: "2026-03-08T19:00:00.000Z",
          reason: "operator requested stop",
          source: "test",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }, 100);

  await assert.rejects(() => runPromise, /state=cancelled/);

  const status = JSON.parse(await readFile(path.join(job.outDir, "status.json"), "utf8"));
  const cancelAck = JSON.parse(await readFile(path.join(job.outDir, "cancelled.json"), "utf8"));

  assert.equal(status.state, "cancelled");
  assert.equal(status.errorCode, "JOB_CANCELLED");
  assert.equal(status.cancelReason, "operator requested stop");
  assert.equal(status.cancelSource, "test");
  assert.equal(cancelAck.reason, "operator requested stop");
  assert.equal(cancelAck.source, "test");
});
