#!/usr/bin/env python3
"""Store screenshots for Slant — louvers with time cut through as glow."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "screenshots"

DIGITS = [
    [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
    [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
    [0x0E, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1F],
    [0x0E, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0E],
    [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
    [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
    [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E],
    [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
    [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
    [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
]

COLON = [0x00, 0x04, 0x04, 0x00, 0x04, 0x04, 0x00]

MATERIALS = {
    "gallery": {
        "slat": (150, 152, 156),
        "glow": (255, 248, 230),
        "shadow": (90, 92, 96),
        "accent_bg": (120, 122, 126),
        "accent_fg": (255, 248, 230),
    },
    "oak": {
        "slat": (140, 96, 58),
        "glow": (255, 170, 70),
        "shadow": (70, 42, 22),
        "accent_bg": (110, 72, 40),
        "accent_fg": (255, 220, 170),
    },
    "night": {
        "slat": (28, 28, 32),
        "glow": (255, 85, 100),
        "shadow": (8, 8, 10),
        "accent_bg": (40, 28, 32),
        "accent_fg": (255, 170, 180),
    },
    "paper": {
        "slat": (236, 232, 220),
        "glow": (40, 70, 120),
        "shadow": (180, 176, 164),
        "accent_bg": (220, 214, 200),
        "accent_fg": (40, 70, 120),
    },
}

DENSITY = {
    "fine": (3, 1),
    "medium": (5, 2),
    "bold": (8, 2),
}


def font(size: int, bold: bool = False):
    for path in (
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def mask_for(ch: str | None):
    if ch is None:
        return None
    if ch == ":":
        return COLON
    if ch.isdigit():
        return DIGITS[int(ch)]
    return None


def layout_digits(w, h, hour, minute, layout="stacked"):
    hs = f"{hour:02d}"
    ms = f"{minute:02d}"

    if layout == "row":
        cell = min((w - 20) // 17, (h - 28) // 7)
        total_w = 17 * cell
        total_h = 7 * cell
        x0 = (w - total_w) // 2
        y0 = (h - total_h - 18) // 2
        cells = [
            (hs[0], x0, y0),
            (hs[1], x0 + 4 * cell, y0),
            (":", x0 + 8 * cell, y0),
            (ms[0], x0 + 10 * cell, y0),
            (ms[1], x0 + 14 * cell, y0),
        ]
        return cells, cell, y0 + total_h + 8, None

    if layout == "corner":
        cell = min(int(w * 0.48) // 9, int(h * 0.42) // 16)
        row_w = 9 * cell
        x0 = 12
        block_h = 15 * cell
        y0 = h - block_h - 22
        cells = [
            (hs[0], x0, y0),
            (hs[1], x0 + 5 * cell, y0),
            (ms[0], x0, y0 + 8 * cell),
            (ms[1], x0 + 5 * cell, y0 + 8 * cell),
        ]
        colon = (x0 + (row_w - 4) // 2, y0 + 7 * cell + max(0, (cell - 2) // 2))
        return cells, cell, max(10, y0 - 18), colon

    cell = min((w - 24) // 9, (h - 36) // 16)
    row_w = 9 * cell
    x0 = (w - row_w) // 2
    block_h = 15 * cell
    y0 = (h - block_h - 20) // 2
    cells = [
        (hs[0], x0, y0),
        (hs[1], x0 + 5 * cell, y0),
        (ms[0], x0, y0 + 8 * cell),
        (ms[1], x0 + 5 * cell, y0 + 8 * cell),
    ]
    colon = (x0 + (row_w - 4) // 2, y0 + 7 * cell + max(0, (cell - 2) // 2))
    return cells, cell, y0 + block_h + 6, colon


def digit_open_map(cells, cell):
    opens: dict[int, list[tuple[int, int]]] = {}
    for ch, x, y in cells:
        mask = mask_for(ch)
        if not mask:
            continue
        for row in range(7):
            bits = mask[row]
            for col in range(5):
                if bits & (0x10 >> col):
                    x0 = x + col * cell
                    y0 = y + row * cell
                    for yy in range(y0, y0 + cell):
                        opens.setdefault(yy, []).append((x0, x0 + cell))
    return opens


def merge_ranges(ranges: list[tuple[int, int]]) -> list[tuple[int, int]]:
    if not ranges:
        return []
    sorted_r = sorted(ranges, key=lambda r: r[0])
    out = [list(sorted_r[0])]
    for x0, x1 in sorted_r[1:]:
        if x0 <= out[-1][1] + 1:
            out[-1][1] = max(out[-1][1], x1)
        else:
            out.append([x0, x1])
    return [(a, b) for a, b in out]


def draw_face(
    size,
    *,
    preset="gallery",
    hour=10,
    minute=42,
    layout="stacked",
    density="medium",
    accent="NOV 7",
    open_extra=1,
    round_mask=False,
):
    w, h = size
    m = MATERIALS[preset]
    thick, gap = DENSITY[density]
    gap = gap + open_extra
    img = Image.new("RGB", size, m["glow"])
    draw = ImageDraw.Draw(img)
    pixels = img.load()

    cells, cell, accent_y, colon = layout_digits(w, h, hour, minute, layout)
    open_map = digit_open_map(cells, cell)
    pitch = thick + gap

    for y in range(0, h, pitch):
        band_h = min(thick, h - y)
        if band_h <= 0:
            continue
        band_ranges = []
        for yy in range(y, y + band_h):
            band_ranges.extend(open_map.get(yy, []))
        opens = merge_ranges(band_ranges)

        if not opens:
            draw.rectangle([0, y, w - 1, y + band_h - 1], fill=m["slat"])
        else:
            cursor = 0
            for x0, x1 in opens:
                if x0 > cursor:
                    draw.rectangle([cursor, y, x0 - 1, y + band_h - 1], fill=m["slat"])
                cursor = x1
            if cursor < w:
                draw.rectangle([cursor, y, w - 1, y + band_h - 1], fill=m["slat"])

        sy = y + band_h
        if sy < h and gap > 0:
            if not opens:
                draw.rectangle([0, sy, w - 1, sy], fill=m["shadow"])
            else:
                cursor = 0
                for x0, x1 in opens:
                    if x0 > cursor:
                        draw.rectangle([cursor, sy, x0 - 1, sy], fill=m["shadow"])
                    cursor = x1
                if cursor < w:
                    draw.rectangle([cursor, sy, w - 1, sy], fill=m["shadow"])

    if colon:
        cx, cy = colon
        draw.rectangle([cx, cy, cx + 3, cy + 3], fill=m["glow"])

    if accent:
        f = font(13, bold=True)
        bb = draw.textbbox((0, 0), accent, font=f)
        tw = bb[2] - bb[0]
        pad = 8
        bw = tw + pad * 2
        bh = (bb[3] - bb[1]) + 6
        bx = (w - bw) // 2 + (0 if round_mask else 6)
        by = accent_y
        if by + bh > h - 4:
            by = h - bh - 6
        if by < 4:
            by = 4
        draw.rectangle([bx + 3, by + 3, bx + 3 + bw - 1, by + 3 + bh - 1], fill=m["shadow"])
        draw.rectangle([bx, by, bx + bw - 1, by + bh - 1], fill=m["accent_bg"])
        draw.text((bx + pad, by + 3), accent, font=f, fill=m["accent_fg"])

    # silence unused
    _ = pixels

    if round_mask:
        mask = Image.new("L", size, 0)
        ImageDraw.Draw(mask).ellipse([0, 0, w - 1, h - 1], fill=255)
        out = Image.new("RGB", size, (0, 0, 0))
        out.paste(img, mask=mask)
        return out
    return img


def save(img, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG", optimize=True)
    print(f"wrote {path.relative_to(ROOT)}")


def main():
    shots = [
        dict(name="01_gallery", preset="gallery", hour=10, minute=42, layout="stacked", accent="NOV 7"),
        dict(name="02_oak", preset="oak", hour=14, minute=8, layout="stacked", density="medium", accent="SAT 7"),
        dict(name="03_night", preset="night", hour=21, minute=35, layout="stacked", accent="FRI", open_extra=0),
        dict(name="04_paper_row", preset="paper", hour=9, minute=15, layout="row", density="fine", accent="8420"),
        dict(name="05_gallery_corner", preset="gallery", hour=16, minute=20, layout="corner", density="bold", accent="BAT 72%"),
    ]
    for shot in shots:
        name = shot.pop("name")
        save(draw_face((200, 228), round_mask=False, **shot), OUT / "emery" / f"{name}.png")
        save(draw_face((260, 260), round_mask=True, **shot), OUT / "gabbro" / f"{name}.png")


if __name__ == "__main__":
    main()
