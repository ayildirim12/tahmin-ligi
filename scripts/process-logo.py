#!/usr/bin/env python3
"""One-off processor for the ChatGPT-generated Tahmin Ligi crest logo.

Not part of the app build — run manually whenever the source logo changes:

    python3 scripts/process-logo.py <path-to-source-png>

Requires Pillow (already a dev-machine dependency) and, for real palette
compression, the `pngquant` CLI (`brew install pngquant`) — falls back to
Pillow's own PNG compression if pngquant isn't on PATH.

Produces (into public/brand/):
  - logo-full-512.png / logo-full-1024.png  — the full badge incl. wordmark, hero use
  - mark-64.png                             — crown+ball only, no wordmark, navbar use
  - favicon-32.png / favicon-16.png         — same crop as mark-64, favicon sizes
  - apple-touch-icon.png                    — same crop, opaque (Apple ignores alpha)

The source is a flat opaque PNG with a solid near-black background baked in
(no alpha) — background removal here is a corner-seeded flood fill (NOT a
global chroma-key), since the artwork's own ball pentagons and ribbon banner
are also near-black and would get punched full of holes by a naive replace.
"""

import sys
import subprocess
import shutil
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter
import numpy as np

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "brand"

# Crop rectangles tuned by eye against this specific source image's layout
# (crown+ball+prediction-card cluster sits above the wordmark ribbon).
# Re-tune these if a differently-composed source logo is ever substituted.
MARK_CROP = (230, 0, 832, 580)  # crown + ball only, excludes the wordmark banner


def flood_fill_background(img: Image.Image, thresh=30, blur_radius=1.5) -> Image.Image:
    img = img.convert("RGBA")
    arr = np.array(img).astype(np.int16)
    h, w = arr.shape[0], arr.shape[1]
    rgb = arr[:, :, :3]

    corners = [rgb[3, 3], rgb[3, w - 4], rgb[h - 4, 3], rgb[h - 4, w - 4]]
    bg = np.mean(corners, axis=0)

    dist = np.abs(rgb - bg).sum(axis=2)
    is_bg_color = dist < thresh
    visited = np.zeros((h, w), dtype=bool)

    q = deque()
    for (y, x) in [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]:
        if is_bg_color[y, x] and not visited[y, x]:
            visited[y, x] = True
            q.append((y, x))

    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and is_bg_color[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    alpha = np.where(visited, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(blur_radius))
    out = img.copy()
    out.putalpha(alpha_img)
    return out


def save_compressed(img: Image.Image, path: Path, size=None):
    out = img.resize(size, Image.LANCZOS) if size else img
    out.save(path, optimize=True, compress_level=9)
    if shutil.which("pngquant"):
        subprocess.run(
            ["pngquant", "--force", "--quality=70-95", "--output", str(path), str(path)],
            check=True,
        )


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <path-to-source-png>")
        sys.exit(1)

    src = Image.open(sys.argv[1])
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    full = flood_fill_background(src)
    full = full.crop(full.getbbox())

    mark = full.crop(MARK_CROP)
    w, h = mark.size
    side = max(w, h)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(mark, ((side - w) // 2, (side - h) // 2), mark)

    fw, fh = full.size
    save_compressed(full, OUT_DIR / "logo-full-1024.png", (1024, round(1024 * fh / fw)))
    save_compressed(full, OUT_DIR / "logo-full-512.png", (512, round(512 * fh / fw)))
    save_compressed(square, OUT_DIR / "mark-64.png", (64, 64))
    save_compressed(square, OUT_DIR / "favicon-32.png", (32, 32))
    save_compressed(square, OUT_DIR / "favicon-16.png", (16, 16))

    # Apple explicitly ignores/flattens alpha on touch icons — composite onto
    # an opaque surface matching the dark theme instead of leaving it to chance.
    apple = Image.new("RGBA", square.size, (25, 24, 29, 255))
    apple.alpha_composite(square)
    save_compressed(apple.convert("RGB"), OUT_DIR / "apple-touch-icon.png", (180, 180))

    print(f"Done. Assets written to {OUT_DIR}")


if __name__ == "__main__":
    main()
