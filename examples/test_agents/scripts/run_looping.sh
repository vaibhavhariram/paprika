#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export PYTHONPATH="$(pwd):${PYTHONPATH:-}"
export PAPRIKA_TRACE_DIR="${PAPRIKA_TRACE_DIR:-$(pwd)/traces}"

echo "Running looping_agent (expects PolicyViolationError)..."
python3 -m agents.looping_agent
