# Contributing to Paprika

## Setup

```bash
# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Clone and install
git clone https://github.com/vaibhavhariram/paprika.git
cd paprika
uv sync --dev
```

## Development

```bash
# Run tests
uv run pytest

# Run linter
uv run ruff check src/ tests/

# Run formatter
uv run ruff format src/ tests/

# Run type checker
uv run mypy src/
```

## Commit Messages

Use conventional commit format:

- `feat: add runtime skeleton and run lifecycle`
- `fix: correct token accumulation in policy engine`
- `test: add replay mismatch integration tests`
- `chore: configure ruff mypy pytest and CI`

## Pull Requests

Each PR should include:

- Summary of changes
- Affected modules
- Tests added or updated
- Known limitations
