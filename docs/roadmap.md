# Roadmap

## Current MVP

- one-shot host wrapper
- strict CLI validation
- normalized output artifacts
- runtime adapters: `opencode`, `ollama`, `goose`
- request-file workflow
- cancellation markers with acknowledgement file
- smoke tests using a fake runtime binary

## Next likely steps

- add multi-stage orchestration inside `local-subagent`, such as Goose
  inspection followed by local-model summarization when useful
- extend the intent surface beyond `desktop_listing`, `inspect_path`, and
  `repo_summary`
- add a small stable API version marker to the request/result contract
- add artifact attachment conventions
- add richer cancel semantics beyond marker files
- add log streaming or polling helpers

## Deferred on purpose

- interactive persistent sessions
- broad host shell access
- ACP-backed lifecycle management
- multi-machine scheduling
- GUI automation
