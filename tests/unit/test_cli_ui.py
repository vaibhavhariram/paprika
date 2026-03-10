"""Tests for the paprika ui CLI command."""

from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import MagicMock, patch

from typer.testing import CliRunner

from paprika.cli import app

if TYPE_CHECKING:
    from pathlib import Path

runner = CliRunner()


class TestUiCommandRegistered:
    def test_help_includes_ui(self) -> None:
        result = runner.invoke(app, ["ui", "--help"])
        assert result.exit_code == 0
        assert "Launch the Paprika trace viewer" in result.output

    def test_help_shows_port_option(self) -> None:
        result = runner.invoke(app, ["ui", "--help"])
        assert "--port" in result.output

    def test_help_shows_no_open_option(self) -> None:
        result = runner.invoke(app, ["ui", "--help"])
        assert "--no-open" in result.output

    def test_help_shows_trace_dir_option(self) -> None:
        result = runner.invoke(app, ["ui", "--help"])
        assert "--trace-dir" in result.output


class TestUiMissingDeps:
    def test_missing_uvicorn_prints_install_hint(self) -> None:
        with patch.dict("sys.modules", {"uvicorn": None}):
            # Force the lazy import to fail by making import raise ImportError
            import builtins

            original_import = builtins.__import__

            def _mock_import(name: str, *args: object, **kwargs: object) -> object:
                if name == "uvicorn":
                    raise ImportError("No module named 'uvicorn'")
                return original_import(name, *args, **kwargs)

            with patch("builtins.__import__", side_effect=_mock_import):
                result = runner.invoke(app, ["ui", "--no-open"])

            assert result.exit_code == 1
            assert "pip install paprika[ui]" in result.output


class TestUiStartup:
    def test_calls_uvicorn_run(self, tmp_trace_dir: Path) -> None:
        mock_uvicorn = MagicMock()
        with patch.dict("sys.modules", {"uvicorn": mock_uvicorn}):
            result = runner.invoke(
                app,
                ["ui", "--no-open", "--trace-dir", str(tmp_trace_dir)],
            )

        assert result.exit_code == 0
        assert "Paprika UI running at" in result.output
        assert "127.0.0.1:8787" in result.output
        assert str(tmp_trace_dir) in result.output
        assert "Press Ctrl+C to stop" in result.output

        mock_uvicorn.run.assert_called_once()
        call_kwargs = mock_uvicorn.run.call_args
        assert call_kwargs.kwargs["host"] == "127.0.0.1"
        assert call_kwargs.kwargs["port"] == 8787

    def test_custom_port(self, tmp_trace_dir: Path) -> None:
        mock_uvicorn = MagicMock()
        with patch.dict("sys.modules", {"uvicorn": mock_uvicorn}):
            result = runner.invoke(
                app,
                ["ui", "--no-open", "--port", "9999", "--trace-dir", str(tmp_trace_dir)],
            )

        assert result.exit_code == 0
        assert "127.0.0.1:9999" in result.output
        mock_uvicorn.run.assert_called_once()
        assert mock_uvicorn.run.call_args.kwargs["port"] == 9999

    def test_trace_dir_passed_through(self, tmp_trace_dir: Path) -> None:
        mock_uvicorn = MagicMock()
        with patch.dict("sys.modules", {"uvicorn": mock_uvicorn}):
            result = runner.invoke(
                app,
                ["ui", "--no-open", "--trace-dir", str(tmp_trace_dir)],
            )

        assert result.exit_code == 0
        assert str(tmp_trace_dir) in result.output

    def test_no_open_suppresses_browser(self, tmp_trace_dir: Path) -> None:
        mock_uvicorn = MagicMock()
        with (
            patch.dict("sys.modules", {"uvicorn": mock_uvicorn}),
            patch("paprika.cli.webbrowser", create=True) as mock_wb,
        ):
            result = runner.invoke(
                app,
                ["ui", "--no-open", "--trace-dir", str(tmp_trace_dir)],
            )

        assert result.exit_code == 0
        mock_wb.open.assert_not_called()

    def test_creates_app_from_store(self, tmp_trace_dir: Path) -> None:
        mock_uvicorn = MagicMock()
        with (
            patch.dict("sys.modules", {"uvicorn": mock_uvicorn}),
            patch("paprika.ui.create_app", wraps=__import__("paprika.ui", fromlist=["create_app"]).create_app) as mock_create,
        ):
            result = runner.invoke(
                app,
                ["ui", "--no-open", "--trace-dir", str(tmp_trace_dir)],
            )

        assert result.exit_code == 0
        mock_create.assert_called_once()
        # The store argument should have the right base_dir
        store_arg = mock_create.call_args.args[0]
        assert store_arg.base_dir == tmp_trace_dir

    def test_port_conflict_shows_helpful_error(self, tmp_trace_dir: Path) -> None:
        mock_uvicorn = MagicMock()
        mock_uvicorn.run.side_effect = OSError("[Errno 48] Address already in use")
        with patch.dict("sys.modules", {"uvicorn": mock_uvicorn}):
            result = runner.invoke(
                app,
                ["ui", "--no-open", "--port", "8787", "--trace-dir", str(tmp_trace_dir)],
            )

        assert result.exit_code == 1
        assert "Port 8787 may be in use" in result.output
        assert "--port 8788" in result.output
