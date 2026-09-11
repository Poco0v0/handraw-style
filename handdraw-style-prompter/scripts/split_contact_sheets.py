#!/usr/bin/env python3
"""Split every numbered contact sheet into individual numbered PNGs."""
from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SHEET = re.compile(r"^[A-G]_(\d{3})(?:-(\d{3}))?\.png$")
ROWS = 4
DEFAULT_COLS = 4

# Most boards are a 4x4 grid. B_036-048 packs 044–048 onto one 5-wide row
# instead of wrapping 048 to the next row; a uniform 4-column crop then
# shifts 045–047 and writes the empty fourth row as 048.png.
# Those five cells are also not equal width, so crop on the printed grid lines.
ROW_LAYOUTS = {
    "B_036-048.png": (4, 4, 5, 4),
}
CELL_BOUNDS = {
    "B_036-048.png": {
        2: (0, 321, 526, 728, 941, 1254),
    },
}
REF_WIDTH = 1254


def single_path(number: int) -> Path:
    bucket = "001-200" if number <= 200 else "201-400"
    return ROOT / "images" / "individual" / bucket / f"{number:03}.png"


def split_sheet(path: Path) -> int:
    match = SHEET.match(path.name)
    if not match:
        return 0
    start = int(match.group(1))
    end = int(match.group(2)) if match.group(2) else start
    expected = end - start + 1
    cols_per_row = ROW_LAYOUTS.get(path.name, (DEFAULT_COLS,) * ROWS)
    written = 0
    with Image.open(path) as image:
        image = image.convert("RGB")
        width, height = image.size
        for row, ncols in enumerate(cols_per_row):
            if written >= expected:
                break
            y0 = round(row * height / ROWS)
            y1 = round((row + 1) * height / ROWS)
            preset = CELL_BOUNDS.get(path.name, {}).get(row)
            if preset:
                scale = width / REF_WIDTH
                xs = [round(x * scale) for x in preset]
            else:
                xs = [round(i * width / ncols) for i in range(ncols + 1)]
            for column in range(ncols):
                if written >= expected:
                    break
                x0, x1 = xs[column], xs[column + 1]
                target = single_path(start + written)
                target.parent.mkdir(parents=True, exist_ok=True)
                image.crop((x0, y0, x1, y1)).save(target)
                written += 1
    if written != expected:
        raise SystemExit(f"{path.name}: expected {expected} tiles, wrote {written}.")
    return written


def main() -> None:
    total = sum(split_sheet(path) for path in sorted((ROOT / "images").glob("[A-G]_*.png")))
    expected = len(json.loads((ROOT / "handdraw-style-prompter" / "references" / "styles.json").read_text(encoding="utf-8")))
    if total != expected:
        raise SystemExit(f"Expected {expected} numbered tiles, wrote {total}.")
    print(f"Split {total} numbered tiles into numbered 200-style buckets.")


if __name__ == "__main__":
    main()
