#!/usr/bin/env python3
"""Locate G-group contact sheets inside this skill's images/ directory."""
from __future__ import annotations

import re
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
IMAGES = SKILL / "images"
STATE_FILE = SKILL / "references" / "contact_sheet_state.json"
CAPACITY = 16
SHEET = re.compile(r"^G_(\d{3})(?:-(\d{3}))?\.png$")


def parse_sheet(path: Path) -> tuple[int, int] | None:
    match = SHEET.match(path.name)
    if not match:
        return None
    start = int(match.group(1))
    end = int(match.group(2)) if match.group(2) else start
    return start, end


def sheet_path(start: int, end: int) -> Path:
    return IMAGES / f"G_{start:03}-{end:03}.png"
