# local-subagent

Host-side wrapper for running narrow OpenClaw jobs on a paired Mac node.

This repo is the custom codebase. It is not a fork of OpenClaw and it is not a
generic remote shell.

## What it does

- runs one-shot host jobs
- supports `opencode`, `ollama`, and `goose`
- writes normalized artifacts into a job directory
- supports request-file input and marker-file cancellation

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
- wrapper contract: [docs/wrapper-contract.md](./docs/wrapper-contract.md)
- OpenClaw integration checkpoint: [docs/openclaw-integration-checkpoint.md](./docs/openclaw-integration-checkpoint.md)
- roadmap: [docs/roadmap.md](./docs/roadmap.md)
