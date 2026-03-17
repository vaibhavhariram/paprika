#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export PYTHONPATH="$(pwd):${PYTHONPATH:-}"
export PAPRIKA_TRACE_DIR="${PAPRIKA_TRACE_DIR:-$(pwd)/traces}"

MODE="${1:-happy}"

case "$MODE" in
    happy)
        echo "Running support_workflow_agent (happy path: Alice)..."
        python3 -m agents.support_workflow_agent
        ;;
    replay)
        if [ -z "${2:-}" ]; then
            echo "Usage: $0 replay <RUN_ID>"
            exit 1
        fi
        echo "Replaying run $2..."
        python3 -m agents.support_workflow_agent --replay "$2"
        ;;
    mismatch)
        echo "Running replay-mismatch demo..."
        python3 -m agents.support_workflow_agent --replay-mismatch
        ;;
    *)
        echo "Usage: $0 {happy|replay <RUN_ID>|mismatch}"
        exit 1
        ;;
esac
