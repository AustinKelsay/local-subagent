# Roadmap

## Current MVP

- one-shot host wrapper
- strict CLI validation
- normalized output artifacts
- one runtime adapter: `opencode`
- smoke tests using a fake runtime binary

## Next likely steps

- add runtime adapters for `ollama` and `goose`
- add a small install script for stable wrapper placement
- add operator-friendly error codes in `status.json`
- add artifact attachment conventions
- add cancellation support
- add log streaming or polling helpers

## Deferred on purpose

- interactive persistent sessions
- broad host shell access
- ACP-backed lifecycle management
- multi-machine scheduling
- GUI automation
