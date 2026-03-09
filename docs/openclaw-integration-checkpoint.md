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

The wrapper is still launched through OpenClaw's generic `exec host=node`
mechanism. This is good enough for the MVP, but it is not the ideal long-term
transport.

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

The current `exec` wrapper path is the right MVP bridge, but not the right
final architecture.

The better long-term shape is:

- OpenClaw writes the host job bundle
- OpenClaw calls a dedicated host-subagent/node action
- the wrapper or runtime executes on the Mac host
- OpenClaw reads artifacts back

That would avoid generic `exec` policy friction leaking into the host-subagent
flow.
