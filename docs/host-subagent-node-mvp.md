# Host Subagent Node MVP

This document captures the intended shape of the first standalone
`local-subagent` release.

## Goal

Allow a Docker-based OpenClaw gateway to delegate a narrow host-side task to the
local Mac through a paired node host, without weakening the gateway container
boundary.

## Core design

Do not teach the container to escape Docker directly.

Instead:

1. Run a local node host on the Mac.
2. Allowlist one wrapper binary on that node host.
3. Have OpenClaw invoke that wrapper through `host=node`.
4. Write all job artifacts into a known host job directory.

## Repo responsibility

This repo owns:

- the wrapper CLI
- runtime adapters
- normalized job artifact writing
- local smoke tests
- standalone setup docs

OpenClaw owns:

- agent skill orchestration
- node pairing
- exec approval policy
- result summarization back to the user

## MVP scope

- one-shot jobs only
- one supported runtime adapter to start
- no persistent interactive session
- no generic host shell access

## Job directory contract

Recommended artifact root:

```text
~/.openclaw/host-jobs/<job-id>/
```

Expected contents:

- `task.md`
- `request.json`
- `status.json`
- `stdout.log`
- `stderr.log`
- `final.md`

## Wrapper contract

The wrapper entry point is:

```text
host-agent-run
```

Required arguments:

- `--runtime`
- `--cwd`
- `--task-file`
- `--out-dir`

Optional arguments:

- `--model`
- `--timeout-seconds`
- `--job-id`

## Security posture

The wrapper should remain narrow and auditable:

- only explicit runtimes
- only explicit input paths
- no arbitrary shell fallback
- no broad PATH mutation
- outputs contained in the selected job directory

## First success criterion

From OpenClaw, request a host-side repo inspection. Success means:

- the gateway remains container-isolated
- the node host runs only the allowlisted wrapper
- the wrapper launches the chosen runtime
- results are written into the host job directory
- OpenClaw can read `status.json` and `final.md` cleanly

## Follow-on phases

Likely next phases:

1. more runtime adapters
2. better artifacts and cancellation
3. persistent or interactive host sessions if the one-shot model proves stable
