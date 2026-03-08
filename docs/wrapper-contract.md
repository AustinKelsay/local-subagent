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
  [--job-id <id>]
```

## Input requirements

- `--cwd` must be an absolute readable path
- `--task-file` must be an absolute readable file
- `--out-dir` must be an absolute path
- `--task-file` must not be empty
- `--timeout-seconds`, when provided, must be a positive integer
- runtime must be explicitly supported by the wrapper

## Current runtime support

- `opencode`

Unknown runtimes are rejected.

## Output files

The wrapper writes:

- `status.json`
- `stdout.log`
- `stderr.log`
- `final.md`

## `status.json`

The wrapper writes `status.json` once at start with `state: "running"` and again
at the end with one of:

- `completed`
- `failed`
- `timed_out`

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
  "model": "claude-opus-4-6",
  "timeoutSeconds": 300,
  "commandLine": "/Users/example/.openclaw-node/bin/host-agent-run --runtime opencode ..."
}
```

## `final.md`

`final.md` is the human-readable handoff artifact.

Behavior:

- on success, stdout becomes the final markdown when non-empty
- on failure or timeout, the wrapper writes a normalized summary with runtime,
  state, command line, and captured output sections

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
