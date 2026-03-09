"""Zero-friction Paprika demo — runs in under 30 seconds, no API keys required."""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING

from typer.testing import CliRunner

from paprika import PaprikaRuntime, PolicyConfig
from paprika.cli import app

if TYPE_CHECKING:
    from paprika.context import PaprikaContext


def main() -> int:
    print("=" * 60)
    print("Paprika Demo — Execution control for AI agents")
    print("=" * 60)
    print()

    # Use temp dir so demo doesn't pollute ~/.paprika
    with tempfile.TemporaryDirectory() as tmpdir:
        trace_dir = Path(tmpdir)
        runtime = PaprikaRuntime(
            policy=PolicyConfig(max_steps=10),
            trace_dir=trace_dir,
        )

        runtime.register_tool("multiply", lambda a: int(a) * 2)
        runtime.register_tool("lookup_customer", lambda email: {"name": "Alice", "email": email})

        @runtime.agent()
        def demo_agent(ctx: PaprikaContext, task: str) -> str:
            # Tool calls
            doubled = ctx.tools.call(name="multiply", args={"a": 21})
            customer = ctx.tools.call(name="lookup_customer", args={"email": "alice@example.com"})
            # Mock LLM call (no API key needed)
            usage = {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}
            resp = ctx.llm.call(
                provider="mock",
                model="mock",
                input={
                    "messages": [{"role": "user", "content": task}],
                    "_mock_response": {
                        "choices": [
                            {
                                "message": {
                                    "content": f"{doubled} for {customer['name']}",
                                    "role": "assistant",
                                }
                            }
                        ]
                    },
                    "_mock_usage": usage,
                },
            )
            content = resp["choices"][0]["message"]["content"]
            return content

        # 1. Run agent
        print("Running agent...")
        result = demo_agent("double 21 and summarize")
        print(f"  Output: {result}")
        print()

        summaries = runtime.trace_store.list_runs(limit=1)
        if not summaries:
            print("Error: No trace saved", file=sys.stderr)
            return 1
        run_id = summaries[0].run_id

        # 2. Trace saved
        print(f"Trace saved: {run_id}")
        print()

        # 3. CLI list (via Python)
        print("CLI: paprika runs list")
        runner = CliRunner()
        list_result = runner.invoke(app, ["runs", "list", "--trace-dir", str(trace_dir)])
        for line in list_result.output.strip().split("\n"):
            print(f"  {line}")
        print()

        # 4. Inspect run
        print("Inspecting run...")
        inspect_result = runner.invoke(
            app, ["runs", "inspect", run_id, "--trace-dir", str(trace_dir)]
        )
        for line in inspect_result.output.strip().split("\n"):
            print(f"  {line}")
        print()

        # 5. Replay
        print("Replaying run...")
        replayed = runtime.replay(run_id)
        print(f"  Replay output: {replayed}")
        print()

    print("=" * 60)
    print("Demo complete. Paprika: trace, enforce, replay.")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
