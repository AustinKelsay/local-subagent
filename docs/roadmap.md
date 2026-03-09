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

- make `goose` the default harness for host inspection tasks
- add recipe/system-prompt conventions for `goose` host jobs
- support feeding gathered host context into `ollama` for local summarization
- add artifact attachment conventions
- add richer cancel semantics beyond marker files
- add log streaming or polling helpers

## Deferred on purpose

- interactive persistent sessions
- broad host shell access
- ACP-backed lifecycle management
- multi-machine scheduling
- GUI automation
