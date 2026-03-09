# Wrapper Contract

`host-agent-run` is the single entry point for the current MVP.

## Purpose

Run one host-side job in a narrow, inspectable way and write normalized artifacts
to a job directory.

## Command shape

```bash
host-agent-run \
  --runtime <runtime> \
  --cwd <absolute-path> \
  --task-file <absolute-path> \
  --out-dir <absolute-path> \
  [--model <name>] \
  [--timeout-seconds <n>] \
  [--job-id <id>] \
  [--cancel-file <absolute-path>]
```

Alternative form:

```bash
host-agent-run --request-file <absolute-path>
```

## Input requirements

- `--cwd` must be an absolute readable path
- `--task-file` must be an absolute readable file
- `--out-dir` must be an absolute path
- `--task-file` must not be empty
- `--timeout-seconds`, when provided, must be a positive integer
- runtime must be explicitly supported by the wrapper
- `--request-file`, when used, must be an absolute path to a JSON object

Request file fields:

- `jobId`
- `runtime`
- `cwd`
- `taskFile`
- `outDir`
- `model`
- `timeoutSeconds`

CLI flags win over request-file values when both are provided.

## Current runtime support

- `opencode`
- `ollama`
- `goose`

Unknown runtimes are rejected.

Runtime notes:

- `ollama` is a prompt runner and should not be assumed to have host tools
- `goose` runs headless and can be configured with builtin tools, a system
  prompt, and a recipe
- the bundled Goose recipe lives at
  `recipes/goose-host-inspector.yaml`

## Output files

The wrapper writes:

- `status.json`
- `stdout.log`
- `stderr.log`
- `final.md`
- `cancelled.json` when cancellation is acknowledged

## `status.json`

The wrapper writes `status.json` once at start with `state: "running"` and again
at the end with one of:

- `completed`
- `failed`
- `timed_out`
- `cancelled`

Example:

```json
{
  "jobId": "job-123",
  "runtime": "opencode",
  "state": "completed",
  "startedAt": "2026-03-08T18:00:00.000Z",
  "finishedAt": "2026-03-08T18:01:12.000Z",
  "exitCode": 0,
  "signal": null,
  "cwd": "/Users/example/project",
  "taskFile": "/Users/example/.openclaw/host-jobs/job-123/task.md",
  "outDir": "/Users/example/.openclaw/host-jobs/job-123",
  "stdoutPath": "/Users/example/.openclaw/host-jobs/job-123/stdout.log",
  "stderrPath": "/Users/example/.openclaw/host-jobs/job-123/stderr.log",
  "finalPath": "/Users/example/.openclaw/host-jobs/job-123/final.md",
  "cancelPath": "/Users/example/.openclaw/host-jobs/job-123/cancel-request.json",
  "cancelAckPath": "/Users/example/.openclaw/host-jobs/job-123/cancelled.json",
  "model": "claude-opus-4-6",
  "timeoutSeconds": 300,
  "commandLine": "/Users/example/.openclaw-node/bin/host-agent-run --runtime opencode ...",
  "errorCode": null,
  "errorDetail": null,
  "timedOut": false,
  "cancelled": false,
  "cancelRequestedAt": null,
  "cancelReason": null,
  "cancelSource": null
}
```

Error codes currently used:

- `SPAWN_ERROR`
- `RUNTIME_EXIT_NONZERO`
- `RUNTIME_SIGNAL_EXIT`
- `JOB_TIMEOUT`
- `JOB_CANCELLED`

## `final.md`

`final.md` is the human-readable handoff artifact.

Behavior:

- on success, stdout becomes the final markdown when non-empty
- on failure or timeout, the wrapper writes a normalized summary with runtime,
  state, command line, and captured output sections

## Cancellation markers

Unless overridden, the wrapper watches:

```text
<out-dir>/cancel-request.json
```

When cancellation is detected, the wrapper:

1. sends termination to the child process
2. marks `status.json` as `cancelled`
3. writes `cancelled.json` with acknowledgement metadata

## Exit behavior

- exit `0` on completed jobs
- exit non-zero on wrapper validation errors, runtime failures, or timeout

Even on failures, the wrapper attempts to persist `status.json` and `final.md`.

## Security posture

This wrapper is meant to be allowlisted as a single explicit executable.

For the MVP:

- do not use it as a generic shell trampoline
- do not allow arbitrary runtimes
- keep all outputs inside the specified job directory
