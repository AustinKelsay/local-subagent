#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${HOME}/.openclaw-node/bin"
TARGET_BIN="${TARGET_DIR}/host-agent-run"
JOB_DIR="${HOME}/.openclaw/host-jobs"

mkdir -p "${TARGET_DIR}"
mkdir -p "${JOB_DIR}"
ln -sf "${ROOT_DIR}/bin/host-agent-run" "${TARGET_BIN}"

cat <<EOF
Installed local-subagent wrapper:
  ${TARGET_BIN}

Prepared job directory:
  ${JOB_DIR}

Suggested next command:
  openclaw approvals allowlist add --node "<node-name>" "${TARGET_BIN}"
EOF
