# OpenClaw Integration Checkpoint

This note captures the current OpenClaw-side integration state for
`local-subagent`.

## Current shape

- OpenClaw runs in Docker
- the Mac host is paired as a node host
- OpenClaw delegates host work by invoking the allowlisted wrapper:
  `/Users/plebdev/.openclaw-node/bin/host-agent-run`
- host job artifacts live under:
  `/Users/plebdev/.openclaw/host-jobs`
- the deterministic launcher path now goes through
  `skills/host-subagent/scripts/run-host-job.mjs`
- that launcher now uses `openclaw --profile host-subagent nodes invoke
  --command system.run ...` with a canonical Mac `cwd`

The in-chat model can still fall back to the older generic host-exec path if it
does not choose the launcher. That routing gap is currently the main OpenClaw
overlay problem.

## Important learned behavior

- when the user asks for a normal `subagent`, prefer native OpenClaw subagent
  behavior
- when the user explicitly asks for a `local subagent`, `host subagent`, or a
  subagent on the Mac/host machine, use the host-subagent overlay flow
- when the user names an Ollama model such as `qwen3.5:9b`, treat that as the
  host-job model, not the main OpenClaw session model

## Path translation

OpenClaw helper scripts must distinguish between:

- container-visible paths used for local reads inside Docker
- host-visible paths used by the Mac wrapper

Current helper output fields:

- `outDir`
- `requestFile`
- `hostOutDir`
- `hostRequestFile`
- `wrapperCommand`

Do not run the Mac wrapper with `/home/node/...` paths. Those are container
paths and will fail or point at the wrong filesystem.

## Exec defaults

Current intended OpenClaw defaults:

- `tools.exec.host = node`
- `tools.exec.security = allowlist`
- `tools.exec.node = 6bc10dfbead5e09861a3345a71006aba42fc7eb0f3fdff113f4b1d1e394d16eb`

Use the node id, not the display name. Binding to `Mac Host Node` by name
caused `unknown node` failures in live testing.

## What is actually working

- the hardened launcher path can create a host job bundle
- it can invoke the paired Mac node
- it can launch `host-agent-run --request-file ...`
- it can read back `status.json` and the other artifacts

This means the transport problem is mostly solved when the launcher path is the
path being used.

## What is still flaky

- natural-language Telegram turns can still bypass the launcher and assemble
  raw host exec calls by hand
- when that happens, the session can regress into older failures such as:
  - `SYSTEM_RUN_DENIED: approval requires an existing canonical cwd`
  - sandbox fallback instead of the paired-node route
- gateway restarts still force repair/reconnect churn for the node and CLI
  identities

## Runtime reality

Transport and runtime capability are separate concerns.

- `goose` or `opencode` should be the default host runtimes for tasks that
  require real tool use or filesystem inspection
- plain `ollama` is currently best treated as a local summarizer over already
  collected host context
- a request such as "tell me what is in Desktop" should not rely on bare
  `ollama run ...` alone to inspect the filesystem truthfully

## Operational caveats

- Telegram `/exec ...` session overrides were unreliable in this setup, so
  persistent config defaults were more reliable
- every gateway restart currently drops the Mac node connection
- after a restart, repair approval is usually required for:
  - the Mac node host
  - the CLI/operator identity

## After restart checklist

1. start or reconnect the Mac node host
2. approve any pending node repair request
3. run `docker compose run --rm openclaw-cli nodes status`
4. if the CLI still reports pairing required, approve the CLI/operator repair
   request too
5. retry the host-subagent flow

## Next architectural step

The current direct launcher path is the right MVP bridge, but not the right
final architecture.

The better long-term shape is:

- OpenClaw writes the host job bundle
- OpenClaw routes local-host requests through a deterministic host-subagent
  launcher instead of ad hoc chat-side exec assembly
- the wrapper or runtime executes on the Mac host
- OpenClaw reads artifacts back

That would avoid generic `exec` policy friction leaking into the host-subagent
flow and reduce model-dependent routing mistakes.
