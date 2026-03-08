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
```

## 3. Pick a stable wrapper path

For allowlist-friendly operation, expose the wrapper at a fixed absolute path:

```bash
mkdir -p ~/.openclaw-node/bin
ln -sf "$PWD/bin/host-agent-run" ~/.openclaw-node/bin/host-agent-run
```

Recommended wrapper path:

```text
~/.openclaw-node/bin/host-agent-run
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

Then inspect:

- `~/.openclaw/host-jobs/job-123/status.json`
- `~/.openclaw/host-jobs/job-123/final.md`

## 8. Environment overrides

The `opencode` adapter supports two environment overrides for operator control:

- `HOST_AGENT_OPENCODE_BIN`
- `HOST_AGENT_OPENCODE_PREFIX_ARGS`

`HOST_AGENT_OPENCODE_PREFIX_ARGS` must be a JSON array of strings.

This is mainly useful for testing and controlled wrapper setups.
