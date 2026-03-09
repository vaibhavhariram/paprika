"""Private formatting utilities for CLI output."""

from __future__ import annotations


def format_table(headers: list[str], rows: list[list[str]]) -> str:
    """Format a simple column-aligned text table."""
    if not rows:
        return ""

    # Calculate column widths
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            if i < len(widths):
                widths[i] = max(widths[i], len(cell))

    # Format header
    header_line = "  ".join(h.ljust(widths[i]) for i, h in enumerate(headers))
    separator = "  ".join("-" * w for w in widths)

    # Format rows
    lines = [header_line, separator]
    for row in rows:
        line = "  ".join(
            (row[i] if i < len(row) else "").ljust(widths[i]) for i in range(len(headers))
        )
        lines.append(line)

    return "\n".join(lines)


def truncate(s: str, max_len: int = 80) -> str:
    """Truncate a string, adding ellipsis if needed."""
    if len(s) <= max_len:
        return s
    return s[: max_len - 3] + "..."


def format_duration(ms: float) -> str:
    """Format a duration in milliseconds to a human-readable string."""
    if ms < 1:
        return f"{ms * 1000:.0f}µs"
    if ms < 1000:
        return f"{ms:.0f}ms"
    return f"{ms / 1000:.2f}s"
