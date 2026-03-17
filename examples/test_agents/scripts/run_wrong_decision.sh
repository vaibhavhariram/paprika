#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export PYTHONPATH="$(pwd):${PYTHONPATH:-}"
export PAPRIKA_TRACE_DIR="${PAPRIKA_TRACE_DIR:-$(pwd)/traces}"

echo "Running wrong_decision_agent (refunds risk-flagged customer)..."
python3 -m agents.wrong_decision_agent
