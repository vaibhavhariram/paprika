"""FastAPI application for the Paprika trace viewer."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from paprika.errors import InvalidRunIdError, TraceNotFoundError
from paprika.ui.transforms import record_to_detail

if TYPE_CHECKING:
    from paprika.trace_store import LocalTraceStore

_STATIC_DIR = Path(__file__).parent / "static"


def build_app(store: LocalTraceStore) -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(title="Paprika UI", docs_url=None, redoc_url=None)

    # --- API routes ---

    @app.get("/api/runs")
    def list_runs(limit: int = Query(default=20, ge=1, le=200)) -> JSONResponse:
        """List recent runs with summary info."""
        summaries = store.list_runs(limit=limit)
        runs = [
            {
                "run_id": s.run_id,
                "agent_name": s.agent_name,
                "started_at": s.started_at.isoformat(),
                "status": s.status,
                "step_count": s.step_count,
                "total_tokens": s.total_tokens,
                "replay_of": s.replay_of,
            }
            for s in summaries
        ]
        return JSONResponse(content={"runs": runs})

    @app.get("/api/runs/{run_id}")
    def get_run(run_id: str) -> JSONResponse:
        """Get detailed timeline for a single run."""
        try:
            record = store.load_record(run_id)
        except TraceNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        except InvalidRunIdError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        return JSONResponse(content=record_to_detail(record))

    # --- Static file serving (SPA) ---

    index_html = _STATIC_DIR / "index.html"

    if _STATIC_DIR.is_dir() and index_html.exists():
        # Serve built frontend assets
        app.mount("/assets", StaticFiles(directory=_STATIC_DIR / "assets"), name="assets")

        @app.get("/{path:path}")
        def spa_fallback(path: str) -> FileResponse:
            """Serve index.html for all non-API routes (SPA routing)."""
            file_path = _STATIC_DIR / path
            if file_path.is_file() and file_path.resolve().is_relative_to(_STATIC_DIR.resolve()):
                return FileResponse(file_path)
            return FileResponse(index_html)

    return app
