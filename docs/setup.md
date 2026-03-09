# Setup

This repo is meant to run on the Mac host that OpenClaw will target through a
paired node host.

## 1. Install prerequisites

- Node.js 22 or newer
- the host runtime you want to use locally
- OpenClaw node host access if this will be invoked from a gateway

## 2. Validate the wrapper locally

From this repo:

```bash
npm test
chmod +x bin/host-agent-run
chmod +x scripts/install-local-subagent.sh
```

## 3. Pick a stable wrapper path

For allowlist-friendly operation, expose the wrapper at a fixed absolute path:

```bash
./scripts/install-local-subagent.sh
```

Recommended wrapper path:

```text
~/.openclaw-node/bin/host-agent-run
```

The install script also creates:

```text
~/.openclaw/host-jobs/
```

## 4. Pair the node host to OpenClaw

On the Mac host:

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Host Build Node"
```

On the gateway side:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

Confirm the paired node supports `system.run`.

## 5. Allowlist the wrapper only

Add a node-host allowlist entry for the exact wrapper path:

```bash
openclaw approvals allowlist add --node "Host Build Node" "$HOME/.openclaw-node/bin/host-agent-run"
```

For this MVP, do not allowlist:

- `bash`
- `zsh`
- `node`
- broad directories

## 6. Point OpenClaw exec at the node host

Config example:

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "Host Build Node"
```

Session example:

```text
/exec host=node security=allowlist node=Host Build Node
```

## 7. Create and run a job

Example:

```bash
mkdir -p ~/.openclaw/host-jobs/job-123
cat > ~/.openclaw/host-jobs/job-123/task.md <<'EOF'
Inspect the repo and summarize the main directories and build system.
EOF

~/.openclaw-node/bin/host-agent-run \
  --runtime opencode \
  --cwd /Users/example/project \
  --task-file ~/.openclaw/host-jobs/job-123/task.md \
  --out-dir ~/.openclaw/host-jobs/job-123 \
  --timeout-seconds 300
```

Or with a request file:

```bash
cat > ~/.openclaw/host-jobs/job-123/request.json <<'EOF'
{
  "jobId": "job-123",
  "runtime": "opencode",
  "cwd": "/Users/example/project",
  "taskFile": "/Users/example/.openclaw/host-jobs/job-123/task.md",
  "outDir": "/Users/example/.openclaw/host-jobs/job-123",
  "timeoutSeconds": 300
}
EOF

~/.openclaw-node/bin/host-agent-run \
  --request-file ~/.openclaw/host-jobs/job-123/request.json
```

Then inspect:

- `~/.openclaw/host-jobs/job-123/status.json`
- `~/.openclaw/host-jobs/job-123/final.md`

## 8. Supported runtimes

- `opencode`
- `ollama`
- `goose`

Notes:

- `ollama` requires a model, either via `--model` or `HOST_AGENT_OLLAMA_MODEL`
- `goose` now defaults to the bundled recipe in
  `recipes/goose-host-inspector.yaml`
- `goose` also defaults to the builtin `developer` extension in headless mode
- `goose` can also use `HOST_AGENT_GOOSE_PROVIDER`

## 9. Cancellation markers

By default the wrapper watches:

```text
<out-dir>/cancel-request.json
```

If that file appears while the job is running, the wrapper terminates the child
process, marks the job as `cancelled`, and writes:

```text
<out-dir>/cancelled.json
```

Example cancel marker:

```json
{
  "requestedAt": "2026-03-08T19:00:00.000Z",
  "reason": "operator requested stop",
  "source": "manual"
}
```

You can override the watched cancel marker path with `--cancel-file`.

## 10. Environment overrides

Adapter environment overrides:

- `HOST_AGENT_OPENCODE_BIN`
- `HOST_AGENT_OPENCODE_PREFIX_ARGS`
- `HOST_AGENT_OLLAMA_BIN`
- `HOST_AGENT_OLLAMA_PREFIX_ARGS`
- `HOST_AGENT_OLLAMA_MODEL`
- `HOST_AGENT_GOOSE_BIN`
- `HOST_AGENT_GOOSE_PREFIX_ARGS`
- `HOST_AGENT_GOOSE_PROVIDER`
- `HOST_AGENT_GOOSE_BUILTINS`
- `HOST_AGENT_GOOSE_SYSTEM_PROMPT`
- `HOST_AGENT_GOOSE_RECIPE`
- `HOST_AGENT_GOOSE_RECIPE_PARAMS`
- `HOST_AGENT_GOOSE_MAX_TURNS`
- `HOST_AGENT_GOOSE_MAX_TOOL_REPETITIONS`

Any `*_PREFIX_ARGS` value must be a JSON array of strings.

Additional Goose notes:

- `HOST_AGENT_GOOSE_BUILTINS` must be a JSON array of builtin names. Default:
  `["developer"]`
- `HOST_AGENT_GOOSE_RECIPE_PARAMS` may be a JSON object or a JSON array of
  `KEY=VALUE` strings
- set `HOST_AGENT_GOOSE_RECIPE=off` to disable the bundled recipe

This is mainly useful for testing and controlled wrapper setups.
