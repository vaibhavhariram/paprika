"""Tests for formatting utilities."""

from __future__ import annotations

from paprika._formatting import format_duration, format_table, truncate


class TestFormatTable:
    def test_basic_table(self) -> None:
        result = format_table(["Name", "Age"], [["Alice", "30"], ["Bob", "25"]])
        lines = result.split("\n")
        assert len(lines) == 4  # header + separator + 2 rows
        assert "Name" in lines[0]
        assert "Alice" in lines[2]

    def test_empty_rows(self) -> None:
        assert format_table(["A", "B"], []) == ""

    def test_column_alignment(self) -> None:
        result = format_table(["X"], [["short"], ["a longer value"]])
        lines = result.split("\n")
        # All lines should have the same length
        assert len(lines[2]) == len(lines[3])


class TestTruncate:
    def test_no_truncation(self) -> None:
        assert truncate("short", 10) == "short"

    def test_truncation(self) -> None:
        result = truncate("a very long string here", 10)
        assert len(result) == 10
        assert result.endswith("...")

    def test_exact_length(self) -> None:
        assert truncate("12345", 5) == "12345"


class TestFormatDuration:
    def test_microseconds(self) -> None:
        assert "µs" in format_duration(0.5)

    def test_milliseconds(self) -> None:
        result = format_duration(123.4)
        assert result == "123ms"

    def test_seconds(self) -> None:
        result = format_duration(1500.0)
        assert result == "1.50s"
