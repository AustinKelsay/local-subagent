# Request API

`local-subagent` now supports two request styles.

## 1. Low-level runtime request

Use this when the caller already knows the exact runtime details.

Example:

```json
{
  "jobId": "job-123",
  "runtime": "goose",
  "cwd": "/Users/example/project",
  "taskFile": "/Users/example/.openclaw/host-jobs/job-123/task.md",
  "outDir": "/Users/example/.openclaw/host-jobs/job-123",
  "model": null,
  "timeoutSeconds": 300
}
```

## 2. High-level intent request

Use this when the caller wants `local-subagent` to choose the runtime and local
execution plan.

Example:

```json
{
  "jobId": "job-124",
  "intent": "desktop_listing",
  "cwd": "/Users/example/.openclaw/host-jobs",
  "taskFile": null,
  "outDir": "/Users/example/.openclaw/host-jobs/job-124",
  "preferredModel": "qwen3.5:9b",
  "timeoutSeconds": 300
}
```

In this mode:

- `local-subagent` selects the runtime
- `preferredModel` is a hint, not a command
- `cwd` may be a stable launch directory rather than the final inspection target
- intents like `desktop_listing` resolve the real Desktop path on the host
- status output records both `requestedModel` and the effective `model`
- for Goose-based intents, the effective `model` can be the hinted local model
  when the wrapper decides to use it

## Supported intents

- `desktop_listing`
- `inspect_path`
- `repo_summary`

Current default orchestration:

- inspection intents resolve to `goose`
- `goose` uses the bundled host-inspector recipe as local configuration plus the
  builtin `developer` tools
- when a model hint is provided for a Goose-based intent, `local-subagent`
  currently runs Goose against Ollama with that model
- bare `ollama` is not used as the default inspector

## Result metadata

`status.json` can now include:

- `inputMode`
- `intent`
- `targetPath`
- `requestedModel`

This lets callers stay generic while still understanding what the local wrapper
actually did.
