"""Verify the package is importable."""


def test_import_paprika() -> None:
    import paprika

    assert paprika.__version__ == "0.1.0"
