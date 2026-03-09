# local-subagent

Host-side wrapper for running narrow OpenClaw jobs on a paired Mac node.

This repo is the custom codebase. It is not a fork of OpenClaw and it is not a
generic remote shell.

## What it does

- runs one-shot host jobs
- accepts either a low-level runtime request or a higher-level intent request
- supports `opencode`, `ollama`, and `goose`
- writes normalized artifacts into a job directory
- supports request-file input and marker-file cancellation

## Runtime guidance

- use `goose` or `opencode` when the host job needs real tools or filesystem
  inspection
- `goose` now defaults to a bundled host-inspector recipe plus the builtin
  `developer` tools in headless mode
- use `ollama` when you already have the relevant host context and want a local
  model to summarize or transform it
- do not assume plain `ollama run ...` can truthfully inspect the host machine
  by itself

## Core workflow

1. OpenClaw writes a host job bundle (`task.md` + `request.json`)
2. a paired node host runs `host-agent-run --request-file ...`
3. the wrapper writes:
   - `status.json`
   - `stdout.log`
   - `stderr.log`
   - `final.md`
   - `cancelled.json` when cancellation is acknowledged
4. OpenClaw reads the artifacts back and summarizes the result

Preferred boundary:

- OpenClaw sends a generic request like `intent=desktop_listing`
- `local-subagent` decides which runtime to use and how to run it
- OpenClaw reads the normalized result back

Typical job path:

```text
~/.openclaw/host-jobs/<job-id>/
```

Stable wrapper path:

```text
~/.openclaw-node/bin/host-agent-run
```

## Quick start

```bash
npm test
./scripts/install-local-subagent.sh
```

Run directly:

```bash
host-agent-run --request-file ~/.openclaw/host-jobs/job-123/request.json
```

## Read next

- setup: [docs/setup.md](./docs/setup.md)
- request API: [docs/request-api.md](./docs/request-api.md)
- wrapper contract: [docs/wrapper-contract.md](./docs/wrapper-contract.md)
- OpenClaw integration checkpoint: [docs/openclaw-integration-checkpoint.md](./docs/openclaw-integration-checkpoint.md)
- roadmap: [docs/roadmap.md](./docs/roadmap.md)
