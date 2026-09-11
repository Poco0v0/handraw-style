#!/usr/bin/env python3
"""Resolve numbered style assets inside this skill's images/ directory."""
from __future__ import annotations

from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
IMAGES = SKILL / "images"


def bucket_name(number: int | str) -> str:
    value = int(number)
    start = ((value - 1) // 200) * 200 + 1
    return f"{start:03}-{start + 199:03}"


def single_path(number: int | str) -> Path:
    value = int(number)
    return IMAGES / "individual" / bucket_name(value) / f"{value:03}.png"


def grid_path(number: int | str) -> Path:
    value = int(number)
    return IMAGES / "individual" / bucket_name(value) / f"{value:03}_grid.jpg"
