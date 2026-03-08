import path from "node:path";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import {
  buildFinalMarkdown,
  createJobPaths,
  ensureJobDir,
  writeFinalMarkdown,
  writeStatus,
} from "../job-status.js";
import { getRuntimeAdapter } from "../runtimes/index.js";

function createUsageError(message) {
  const error = new Error(message);
  error.exitCode = 2;
  return error;
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw createUsageError(`Unexpected argument "${token}"`);
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw createUsageError(`Missing value for --${key}`);
    }

    options[key] = value;
    index += 1;
  }

  return options;
}

async function loadRequestFile(requestFilePath) {
  if (!path.isAbsolute(requestFilePath)) {
    throw createUsageError("--request-file must be an absolute path");
  }

  await access(requestFilePath, constants.R_OK);

  let parsed;
  try {
    parsed = JSON.parse(await readFile(requestFilePath, "utf8"));
  } catch (error) {
    throw createUsageError(
      `--request-file must contain valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw createUsageError("--request-file must contain a JSON object");
  }

  return /** @type {Record<string, unknown>} */ (parsed);
}

async function validateDirectory(absolutePath, label) {
  if (!path.isAbsolute(absolutePath)) {
    throw createUsageError(`${label} must be an absolute path`);
  }
  await access(absolutePath, constants.R_OK);
}

async function validateFile(absolutePath, label) {
  if (!path.isAbsolute(absolutePath)) {
    throw createUsageError(`${label} must be an absolute path`);
  }
  await access(absolutePath, constants.R_OK);
}

function toStringOption(source, key) {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function toPositiveIntOption(source, key, label) {
  if (source[key] === undefined) {
    return undefined;
  }

  const rawValue = source[key];
  const numeric =
    typeof rawValue === "number"
      ? rawValue
      : typeof rawValue === "string"
        ? Number.parseInt(rawValue, 10)
        : Number.NaN;

  if (!Number.isFinite(numeric) || numeric < 1) {
    throw createUsageError(`${label} must be a positive integer`);
  }

  return numeric;
}

function normalizeOptions(raw, request = {}) {
  const runtime = toStringOption(raw, "runtime") ?? toStringOption(request, "runtime");
  const cwd = toStringOption(raw, "cwd") ?? toStringOption(request, "cwd");
  const taskFile = toStringOption(raw, "task-file") ?? toStringOption(request, "taskFile");
  const outDir = toStringOption(raw, "out-dir") ?? toStringOption(request, "outDir");

  if (!runtime || !cwd || !taskFile || !outDir) {
    throw createUsageError(
      "Required input: --runtime <id> --cwd <path> --task-file <path> --out-dir <path> or --request-file <path>",
    );
  }

  const timeoutSeconds =
    toPositiveIntOption(raw, "timeout-seconds", "--timeout-seconds") ??
    toPositiveIntOption(request, "timeoutSeconds", "request.timeoutSeconds");

  return {
    runtime,
    cwd: path.resolve(cwd),
    taskFile: path.resolve(taskFile),
    outDir: path.resolve(outDir),
    model: toStringOption(raw, "model") ?? toStringOption(request, "model"),
    timeoutSeconds,
    jobId: toStringOption(raw, "job-id") ?? toStringOption(request, "jobId"),
    requestFile: toStringOption(raw, "request-file"),
  };
}

function shellEscape(value) {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) {
    return value;
  }
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

async function runChildProcess(launchSpec, options, deps) {
  const env = { ...deps.env, ...launchSpec.env };
  const child = deps.spawnFn(launchSpec.command, launchSpec.args, {
    cwd: options.cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  return await new Promise((resolve, reject) => {
    let timedOut = false;
    let timeoutId;
    let killId;

    const stdoutChunks = [];
    const stderrChunks = [];
    const stdoutStream = createWriteStream(options.paths.stdoutPath, { flags: "w" });
    const stderrStream = createWriteStream(options.paths.stderrPath, { flags: "w" });

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdoutChunks.push(Buffer.from(chunk));
        stdoutStream.write(chunk);
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderrChunks.push(Buffer.from(chunk));
        stderrStream.write(chunk);
      });
    }

    if (options.timeoutSeconds) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        killId = setTimeout(() => {
          child.kill("SIGKILL");
        }, 2000);
        killId.unref();
      }, options.timeoutSeconds * 1000);
      timeoutId.unref();
    }

    const finalizeStreams = () =>
      Promise.all([
        new Promise((streamResolve) => stdoutStream.end(streamResolve)),
        new Promise((streamResolve) => stderrStream.end(streamResolve)),
      ]);

    child.once("error", async (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (killId) {
        clearTimeout(killId);
      }
      await finalizeStreams();
      reject(error);
    });

    child.once("close", async (code, signal) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (killId) {
        clearTimeout(killId);
      }
      await finalizeStreams();
      resolve({
        code,
        signal,
        timedOut,
        stdoutText: Buffer.concat(stdoutChunks).toString("utf8"),
        stderrText: Buffer.concat(stderrChunks).toString("utf8"),
      });
    });
  });
}

export async function main(argv, deps = {}) {
  const runtimeDeps = {
    env: deps.env ?? process.env,
    spawnFn: deps.spawnFn ?? spawn,
    now: deps.now ?? (() => new Date()),
  };

  const rawOptions = parseArgs(argv);
  const request = rawOptions["request-file"]
    ? await loadRequestFile(path.resolve(rawOptions["request-file"]))
    : {};
  const options = normalizeOptions(rawOptions, request);
  await validateDirectory(options.cwd, "--cwd");
  await validateFile(options.taskFile, "--task-file");

  await ensureJobDir(options.outDir);
  const paths = createJobPaths(options.outDir);
  await mkdir(options.outDir, { recursive: true });

  const jobId = options.jobId || path.basename(options.outDir);
  const taskText = await readFile(options.taskFile, "utf8");
  if (!taskText.trim()) {
    throw createUsageError("--task-file must not be empty");
  }

  const runtime = getRuntimeAdapter(options.runtime);
  const launchSpec = runtime.buildLaunchSpec({
    cwd: options.cwd,
    outDir: options.outDir,
    taskFile: options.taskFile,
    taskText,
    model: options.model,
    timeoutSeconds: options.timeoutSeconds,
    env: runtimeDeps.env,
  });

  const commandLine = [launchSpec.command, ...launchSpec.args].map(shellEscape).join(" ");
  const startedAt = runtimeDeps.now().toISOString();

  await writeStatus(paths.statusPath, {
    jobId,
    runtime: options.runtime,
    state: "running",
    startedAt,
    finishedAt: null,
    exitCode: null,
    signal: null,
    cwd: options.cwd,
    taskFile: options.taskFile,
    requestFile: options.requestFile ?? null,
    outDir: options.outDir,
    stdoutPath: paths.stdoutPath,
    stderrPath: paths.stderrPath,
    finalPath: paths.finalPath,
    model: options.model ?? null,
    timeoutSeconds: options.timeoutSeconds ?? null,
    commandLine,
  });

  let result;
  try {
    result = await runChildProcess(launchSpec, { ...options, paths }, runtimeDeps);
  } catch (error) {
    const finishedAt = runtimeDeps.now().toISOString();
    const markdown = buildFinalMarkdown({
      runtime: options.runtime,
      state: "failed",
      commandLine,
      stdoutText: "",
      stderrText: error instanceof Error ? error.message : String(error),
      timedOut: false,
    });
    await writeFinalMarkdown(paths.finalPath, markdown);
    await writeStatus(paths.statusPath, {
      jobId,
      runtime: options.runtime,
      state: "failed",
      startedAt,
      finishedAt,
      exitCode: null,
      signal: null,
      cwd: options.cwd,
      taskFile: options.taskFile,
      requestFile: options.requestFile ?? null,
      outDir: options.outDir,
      stdoutPath: paths.stdoutPath,
      stderrPath: paths.stderrPath,
      finalPath: paths.finalPath,
      model: options.model ?? null,
      timeoutSeconds: options.timeoutSeconds ?? null,
      commandLine,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const finishedAt = runtimeDeps.now().toISOString();
  const state = result.timedOut
    ? "timed_out"
    : result.code === 0
      ? "completed"
      : "failed";

  await writeFinalMarkdown(
    paths.finalPath,
    buildFinalMarkdown({
      runtime: options.runtime,
      state,
      commandLine,
      stdoutText: result.stdoutText,
      stderrText: result.stderrText,
      timedOut: result.timedOut,
    }),
  );

  await writeStatus(paths.statusPath, {
    jobId,
    runtime: options.runtime,
    state,
    startedAt,
    finishedAt,
    exitCode: result.code,
    signal: result.signal,
    cwd: options.cwd,
    taskFile: options.taskFile,
    requestFile: options.requestFile ?? null,
    outDir: options.outDir,
    stdoutPath: paths.stdoutPath,
    stderrPath: paths.stderrPath,
    finalPath: paths.finalPath,
    model: options.model ?? null,
    timeoutSeconds: options.timeoutSeconds ?? null,
    commandLine,
  });

  if (state !== "completed") {
    const failure = new Error(`host-agent-run finished with state=${state}`);
    failure.exitCode = typeof result.code === "number" && result.code !== 0 ? result.code : 1;
    throw failure;
  }

  return {
    jobId,
    state,
    finalPath: paths.finalPath,
    statusPath: paths.statusPath,
  };
}
