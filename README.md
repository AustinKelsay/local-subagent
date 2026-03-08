# local-subagent

Host-side wrapper for the OpenClaw host-subagent MVP.

`local-subagent` is a small Node-based wrapper that runs on a paired macOS node
host and executes a narrow, allowlisted host job on behalf of a containerized
OpenClaw gateway.

It is intentionally not a generic remote shell.

## What it does

- accepts one-shot host jobs
- validates a strict CLI contract
- launches one supported runtime
- captures stdout and stderr
- writes normalized result artifacts into a job directory

The current MVP supports one runtime:

- `opencode`

## Why this exists

The goal is to let Docker OpenClaw delegate a specific task to the local Mac
without teaching the container to escape Docker directly.

The trust boundary is:

- OpenClaw gateway stays in Docker
- a paired node host exposes `system.run`
- only one wrapper binary is allowlisted on the node host
- the wrapper launches a known runtime and writes results into a known path

## CLI

Installed binary:

- `host-agent-run`

Required flags:

- `--runtime <id>`
- `--cwd <absolute-path>`
- `--task-file <absolute-path>`
- `--out-dir <absolute-path>`

Alternative input:

- `--request-file <absolute-path-to-request.json>`

Optional flags:

- `--model <name>`
- `--timeout-seconds <n>`
- `--job-id <id>`

Example:

```bash
host-agent-run \
  --runtime opencode \
  --cwd /Users/example/project \
  --task-file /Users/example/.openclaw/host-jobs/job-123/task.md \
  --out-dir /Users/example/.openclaw/host-jobs/job-123 \
  --model claude-opus-4-6 \
  --timeout-seconds 300
```

Or drive it from a request file:

```bash
host-agent-run --request-file /Users/example/.openclaw/host-jobs/job-123/request.json
```

## Job artifacts

The wrapper writes these files under `--out-dir`:

- `status.json`
- `stdout.log`
- `stderr.log`
- `final.md`

Typical host job layout:

```text
~/.openclaw/host-jobs/<job-id>/
  task.md
  request.json
  status.json
  stdout.log
  stderr.log
  final.md
```

## Quick start

Requirements:

- Node.js 22+
- a host runtime installed locally if you want to do real runs

Run tests:

```bash
npm test
```

Make the wrapper executable:

```bash
chmod +x bin/host-agent-run
```

Optional stable allowlist path:

```bash
./scripts/install-local-subagent.sh
```

## OpenClaw integration

This repo is designed to be called by OpenClaw through:

- a paired node host
- `exec` with `host=node`
- `security=allowlist`
- an allowlist entry for the wrapper path only

See:

- [Setup](./docs/setup.md)
- [Wrapper Contract](./docs/wrapper-contract.md)
- [Roadmap](./docs/roadmap.md)

## Current limitations

- one-shot jobs only
- no interactive session handoff
- no streaming log transport back into chat
- no cancellation workflow yet
- only one runtime adapter today
