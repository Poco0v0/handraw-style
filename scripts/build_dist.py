#!/usr/bin/env python3
"""Copy the static gallery and every used style asset into dist/."""
from __future__ import annotations

import json
import shutil
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
DIST = ROOT / "dist"
STYLES = ROOT / "handdraw-style-prompter" / "references" / "styles.json"
AVATAR_SRC = ROOT / "images" / "individual" / "001-200" / "001.png"


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as handle:
        handle.read(16)
        return struct.unpack(">II", handle.read(8))


def image_src(number: str) -> Path:
    bucket = "001-200" if int(number) <= 200 else "201-400"
    return ROOT / "images" / "individual" / bucket / f"{number}.png"


def copy_tree_file(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)


def main() -> None:
    styles = json.loads(STYLES.read_text(encoding="utf-8"))
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    for path in SITE.rglob("*"):
        if path.is_file():
            copy_tree_file(path, DIST / path.relative_to(SITE))

    if not AVATAR_SRC.exists():
        raise SystemExit(f"Missing avatar source: {AVATAR_SRC}")
    copy_tree_file(AVATAR_SRC, DIST / "img" / "avatar.png")

    data_dir = DIST / "data"
    images_dir = DIST / "images"
    data_dir.mkdir(parents=True, exist_ok=True)
    images_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(STYLES, data_dir / "styles.json")

    catalog: list[dict] = []
    missing: list[str] = []
    for style in styles:
        src = image_src(style["number"])
        if not src.exists():
            missing.append(style["number"])
            continue
        dest_name = f'{style["number"]}.png'
        shutil.copy2(src, images_dir / dest_name)
        width, height = png_size(src)
        catalog.append({
            **style,
            "image": f"images/{dest_name}",
            "width": width,
            "height": height,
        })

    if missing:
        raise SystemExit(f"Missing style images: {', '.join(missing)}")

    (data_dir / "catalog.js").write_text(
        "window.STYLE_CATALOG = " + json.dumps(catalog, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )

    expected = {
        DIST / "index.html",
        DIST / "css" / "gallery.css",
        DIST / "js" / "gallery.js",
        DIST / "img" / "favicon.svg",
        DIST / "img" / "avatar.png",
        DIST / "data" / "styles.json",
        DIST / "data" / "catalog.js",
    }
    absent = [str(path.relative_to(DIST)) for path in expected if not path.exists()]
    if absent:
        raise SystemExit(f"dist is missing required files: {', '.join(absent)}")
    if len(list(images_dir.glob("*.png"))) != len(styles):
        raise SystemExit("dist/images count does not match styles.json")

    print(f"Built {len(catalog)} styles into {DIST}")
    print(f"Copied {len(styles)} preview images, styles.json, and site assets.")


if __name__ == "__main__":
    main()
