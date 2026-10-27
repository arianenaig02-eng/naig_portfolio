"""
Build the QR code, the printable business card and the social preview.

    pip install pillow segno
    python tools/make-print-assets.py

Change SITE_URL once the portfolio is online, then re-run this script.
"""

from pathlib import Path

import numpy as np
import segno
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
DOWNLOADS = ROOT / "assets" / "downloads"
FONT_DIR = ROOT / "tools" / "fonts"
for folder in (IMG, DOWNLOADS):
    folder.mkdir(parents=True, exist_ok=True)

SITE_URL = "https://ariane-naig.vercel.app"

NAME = "Ariane Mae Naig"
ROLE = "IT Student  ·  Graphic Designer  ·  Web Developer"
EMAIL = "ariane.naig02@gmail.com"
PHONE = "0969 424 3015"
LINKEDIN = "linkedin.com/in/ariane-mae-882720329"

INK = (43, 29, 66)
INK_SOFT = (111, 90, 143)
CREAM = (250, 247, 255)
DEEP = (42, 28, 64)
DEEP_2 = (74, 45, 120)

DPI = 300
CARD_W, CARD_H = 1050, 600  # 3.5 x 2 in at 300 dpi


# ---------------------------------------------------------------- helpers
def font(name: str, size: int, axes=None) -> ImageFont.FreeTypeFont:
    face = ImageFont.truetype(str(FONT_DIR / name), size)
    if axes:
        face.set_variation_by_axes(axes)
    return face


def fraunces(size, weight=500, soft=40, wonk=1, opsz=144, italic=False):
    name = "Fraunces-Italic.ttf" if italic else "Fraunces.ttf"
    return font(name, size, [soft, wonk, opsz, weight])


def dm(size, weight=400, opsz=20):
    return font("DMSans.ttf", size, [opsz, weight])


def gradient(size, stops, angle=135):
    """Linear gradient between colour stops."""
    width, height = size
    xs = np.linspace(0, 1, width)
    ys = np.linspace(0, 1, height)
    if angle % 360 in (90, 270):
        ramp = np.tile(ys[:, None], (1, width))
    elif angle % 360 in (0, 180):
        ramp = np.tile(xs[None, :], (height, 1))
    else:
        ramp = (xs[None, :] + ys[:, None]) / 2
    if angle > 180:
        ramp = 1 - ramp
    ramp = np.clip(ramp, 0, 1)
    positions = np.linspace(0, 1, len(stops))
    channels = [np.interp(ramp, positions, [s[i] for s in stops]) for i in range(3)]
    rgb = np.stack(channels, axis=-1).astype(np.uint8)
    return Image.fromarray(rgb, "RGB").convert("RGBA")


def radial_glow(size, center, radius, colour, opacity=255):
    width, height = size
    yy, xx = np.mgrid[0:height, 0:width]
    distance = np.sqrt((xx - center[0]) ** 2 + (yy - center[1]) ** 2) / radius
    alpha = np.clip(1 - distance, 0, 1) ** 2 * opacity
    layer = np.zeros((height, width, 4), dtype=np.uint8)
    layer[..., 0], layer[..., 1], layer[..., 2] = colour
    layer[..., 3] = alpha.astype(np.uint8)
    return Image.fromarray(layer, "RGBA")


def tracked(draw, xy, text, face, fill, tracking=0.0, anchor_left=True):
    """Draw text with extra letter spacing."""
    x, y = xy
    widths = [draw.textlength(char, font=face) for char in text]
    total = sum(widths) + tracking * (len(text) - 1)
    if not anchor_left:
        x -= total
    for char, char_width in zip(text, widths):
        draw.text((x, y), char, font=face, fill=fill)
        x += char_width + tracking
    return total


def qr_image(size, dark=(43, 29, 66), light=None, quiet=2):
    qr = segno.make(SITE_URL, error="h")
    path = IMG / "_qr_tmp.png"
    qr.save(path, scale=1, border=quiet, dark=dark, light=light or None)
    image = Image.open(path).convert("RGBA")
    path.unlink()
    return image.resize((size, size), Image.NEAREST)


# ---------------------------------------------------------------- QR for the site
def build_qr():
    qr = segno.make(SITE_URL, error="h")
    qr.save(
        IMG / "qr-portfolio.png",
        scale=24,
        border=3,
        dark=(43, 29, 66),
        light=(255, 255, 255),
    )
    qr.save(IMG / "qr-portfolio.svg", scale=1, border=3, dark="#2b1d42", light="#ffffff")
    print(f"  assets/img/qr-portfolio.png  ({SITE_URL})")


# ---------------------------------------------------------------- business card
def card_front() -> Image.Image:
    card = gradient((CARD_W, CARD_H), [(247, 242, 255), (232, 219, 255), (221, 203, 255)], 120)
    card.alpha_composite(radial_glow((CARD_W, CARD_H), (880, 60), 420, (196, 168, 255), 210))
    card.alpha_composite(radial_glow((CARD_W, CARD_H), (60, 560), 320, (255, 214, 224), 120))

    draw = ImageDraw.Draw(card)
    draw.rounded_rectangle((26, 26, CARD_W - 26, CARD_H - 26), 18, outline=(120, 92, 168, 60), width=2)

    # monogram
    draw.ellipse((CARD_W - 210, 52, CARD_W - 66, 196), fill=(255, 255, 255, 150))
    monogram = fraunces(78, 600, 30, 1, 144)
    draw.text((CARD_W - 138, 112), "A", font=monogram, fill=INK, anchor="mm")

    x = 78
    tracked(draw, (x, 74), "PORTFOLIO  ·  2026", dm(15, 600), INK_SOFT, 4.2)

    draw.text((x - 4, 108), NAME, font=fraunces(62, 550, 30, 1, 144), fill=INK)

    tracked(draw, (x, 196), ROLE.upper(), dm(14, 500), INK_SOFT, 2.4)
    draw.line((x, 240, CARD_W - 78, 240), fill=(120, 92, 168, 70), width=2)

    rows = [
        ("EMAIL", EMAIL),
        ("LINKEDIN", LINKEDIN),
        ("SMS", PHONE),
    ]
    y = 274
    for label, value in rows:
        tracked(draw, (x, y), label, dm(12, 700), (154, 128, 190), 3.0)
        draw.text((x + 118, y - 5), value, font=dm(21, 500), fill=INK)
        y += 54

    draw.text(
        (x - 2, 470),
        "Bridging aesthetics and functionality.",
        font=fraunces(26, 400, 60, 1, 144, italic=True),
        fill=(122, 96, 158),
    )
    tracked(draw, (x, 516), "ARIANE-NAIG.VERCEL.APP", dm(12, 600), (168, 143, 202), 2.6)
    return card


def card_back() -> Image.Image:
    card = gradient((CARD_W, CARD_H), [(38, 24, 58), (58, 34, 92), (86, 52, 136)], 120)
    card.alpha_composite(radial_glow((CARD_W, CARD_H), (150, 520), 460, (124, 86, 190), 190))
    card.alpha_composite(radial_glow((CARD_W, CARD_H), (980, 40), 380, (168, 128, 230), 150))

    draw = ImageDraw.Draw(card)
    draw.rounded_rectangle((26, 26, CARD_W - 26, CARD_H - 26), 18, outline=(255, 255, 255, 40), width=2)

    # QR panel
    panel = (CARD_W - 344, 96, CARD_W - 96, 344)
    draw.rounded_rectangle(panel, 26, fill=(255, 255, 255, 255))
    code = qr_image(212, quiet=1)
    card.alpha_composite(code, (panel[0] + 18, panel[1] + 18))

    x = 78
    draw.text((x, 104), "Scan to see", font=fraunces(44, 500, 40, 1, 144), fill=(255, 255, 255))
    draw.text((x, 158), "the work.", font=fraunces(44, 500, 40, 1, 144), fill=(214, 190, 255))

    tracked(draw, (x, 236), "ARIANE-NAIG.VERCEL.APP", dm(13, 600), (206, 186, 240), 2.6)

    draw.line((x, 306, 640, 306), fill=(255, 255, 255, 45), width=2)

    draw.text((x, 340), NAME, font=fraunces(34, 500, 30, 1, 144), fill=(255, 255, 255))
    tracked(draw, (x, 396), "IT STUDENT  ·  DESIGNER  ·  DEVELOPER", dm(12, 500), (198, 176, 235), 2.2)
    draw.text((x, 442), EMAIL, font=dm(19, 400), fill=(226, 212, 250))
    draw.text((x, 476), PHONE, font=dm(19, 400), fill=(226, 212, 250))
    return card


def build_card():
    front = card_front().convert("RGB")
    back = card_back().convert("RGB")
    front.save(DOWNLOADS / "business-card-front.png", dpi=(DPI, DPI))
    back.save(DOWNLOADS / "business-card-back.png", dpi=(DPI, DPI))
    front.save(
        DOWNLOADS / "ariane-naig-business-card.pdf",
        "PDF",
        resolution=DPI,
        save_all=True,
        append_images=[back],
    )
    print("  assets/downloads/ariane-naig-business-card.pdf")


# ---------------------------------------------------------------- social preview
def build_og():
    width, height = 1200, 630
    og = gradient((width, height), [(248, 244, 255), (231, 218, 255), (216, 197, 255)], 120)
    og.alpha_composite(radial_glow((width, height), (1020, 90), 520, (198, 170, 255), 220))
    og.alpha_composite(radial_glow((width, height), (120, 600), 420, (255, 214, 226), 130))

    person = Image.open(IMG / "ariane-hero.webp").convert("RGBA")
    target_h = 660
    person = person.resize((round(person.width * target_h / person.height), target_h), Image.LANCZOS)
    person = person.crop((0, 0, person.width, height))
    og.alpha_composite(person, (width - person.width - 30, 0))

    draw = ImageDraw.Draw(og)
    tracked(draw, (86, 96), "PORTFOLIO  ·  2026", dm(17, 600), INK_SOFT, 5)
    draw.text((80, 138), "Ariane", font=fraunces(118, 550, 30, 1, 144), fill=INK)
    draw.text((80, 250), "Mae Naig", font=fraunces(118, 550, 30, 1, 144), fill=INK)
    tracked(draw, (86, 400), "IT STUDENT  ·  GRAPHIC DESIGNER  ·  WEB DEVELOPER", dm(15, 500), INK_SOFT, 2.4)
    draw.line((86, 452, 560, 452), fill=(120, 92, 168, 90), width=2)
    draw.text(
        (86, 480),
        "Visually engaging, user-focused\ndigital experiences.",
        font=dm(25, 400),
        fill=INK_SOFT,
        spacing=10,
    )
    og.convert("RGB").save(IMG / "og-image.jpg", quality=88)
    print("  assets/img/og-image.jpg")


if __name__ == "__main__":
    build_qr()
    build_card()
    build_og()
