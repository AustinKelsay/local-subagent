#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${HOME}/.openclaw-node/bin"
TARGET_BIN="${TARGET_DIR}/host-agent-run"
JOB_DIR="${HOME}/.openclaw/host-jobs"

mkdir -p "${TARGET_DIR}"
mkdir -p "${JOB_DIR}"
rm -f "${TARGET_BIN}"
cat > "${TARGET_BIN}" <<EOF
#!/usr/bin/env bash
set -euo pipefail

exec node "${ROOT_DIR}/bin/host-agent-run" "\$@"
EOF
chmod 755 "${TARGET_BIN}"

cat <<EOF
Installed local-subagent wrapper:
  ${TARGET_BIN}

Prepared job directory:
  ${JOB_DIR}

Suggested next command:
  openclaw approvals allowlist add --node "<node-name>" "${TARGET_BIN}"
EOF
