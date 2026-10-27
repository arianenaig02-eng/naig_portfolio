"""
Prepare every image the portfolio needs.

    python tools/prepare-images.py

Optional cutout step needs `rembg` + `pillow`:
    pip install pillow rembg onnxruntime

Source photos live outside the project; adjust SOURCE_DIR if needed.
The generated files land in assets/img, assets/designs and assets/certificates.
"""

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = Path(r"D:\Florie Mae Naig\Documents")
PHOTO = SOURCE_DIR / "IMG_6473.JPG"

IMG = ROOT / "assets" / "img"
DESIGNS = ROOT / "assets" / "designs"
CERTS = ROOT / "assets" / "certificates"
for folder in (IMG, DESIGNS, CERTS):
    folder.mkdir(parents=True, exist_ok=True)


def cutout() -> Image.Image:
    """Remove the studio backdrop, keeping hair detail."""
    cached = ROOT / "tools" / ".cache" / "cutout.png"
    if cached.exists():
        return Image.open(cached)

    from rembg import new_session, remove

    photo = ImageOps.exif_transpose(Image.open(PHOTO)).convert("RGB")
    width = 2600
    photo = photo.resize((width, round(photo.height * width / photo.width)), Image.LANCZOS)
    result = remove(
        photo,
        session=new_session("isnet-general-use"),
        alpha_matting=True,
        alpha_matting_foreground_threshold=245,
        alpha_matting_background_threshold=12,
        alpha_matting_erode_size=8,
    )
    cached.parent.mkdir(parents=True, exist_ok=True)
    result.save(cached)
    return result


def save_webp(image: Image.Image, path: Path, quality: int = 88) -> None:
    image.save(path, "WEBP", quality=quality, method=6)
    print(f"  {path.relative_to(ROOT)}  {image.width}x{image.height}  {path.stat().st_size // 1024} KB")


def portraits() -> None:
    person = cutout()
    print("portraits")

    hero = person.crop((130, 90, 1680, 1900))
    hero = hero.resize((1240, round(hero.height * 1240 / hero.width)), Image.LANCZOS)
    save_webp(hero, IMG / "ariane-hero.webp", 90)

    avatar = person.crop((250, 300, 1450, 1500)).resize((900, 900), Image.LANCZOS)
    save_webp(avatar, IMG / "ariane-about.webp", 90)


def design_samples() -> None:
    print("design samples")
    samples = [
        ("guess-what.webp", SOURCE_DIR / "Coffee Jelly Soft Launch_20250518_130018_0000.png", 1500),
        ("kalikasan.webp", SOURCE_DIR / "KALIKASAN KILOS KABATAAN_20250514_102516_0000.png", 1500),
        ("happy-birthday.webp", SOURCE_DIR / "received_973917624560640.jpeg", 1500),
        ("tarot-scroll.webp", SOURCE_DIR / "2_20241219_233701_0001.png", 1500),
        ("spiderman-collage.webp", SOURCE_DIR / "Untitled design_20260813_234236_0000.png", 900),
    ]
    for name, source, target_width in samples:
        image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
        if image.width > target_width:
            height = round(image.height * target_width / image.width)
            image = image.resize((target_width, height), Image.LANCZOS)
        save_webp(image, DESIGNS / name, 84)


def certificates() -> None:
    print("certificates")
    for name, source in [
        ("cloud-foundations.webp", SOURCE_DIR / "3a8cf99d-b339-4c69-a3b5-a1b7c74cb21c.jpg"),
        ("workato-foundations.webp", SOURCE_DIR / "772d3fb7-f53e-42d0-b212-942d9a4d3a38.jpg"),
    ]:
        image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
        save_webp(image, CERTS / name, 88)


if __name__ == "__main__":
    portraits()
    design_samples()
    certificates()
