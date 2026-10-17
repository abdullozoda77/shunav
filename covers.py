"""Book covers.

1. "Tajik edition" covers (TAJIK_COVERS): leather-and-gold cover art made with Figma AI (cover-art/), with the
   title and author written on it here in the Philosopher font (so the Tajik letters are always right).
2. Otherwise a real Persian miniature from The Metropolitan Museum of Art (Open Access, public domain / CC0).

    .venv/bin/python covers.py

Each painting is downloaded once (data/covers/), cropped to the painted part of the page and saved as
media/covers/<id>.jpg. Books are matched by title, so run it again after import_books.py replaces a book.
Needs Pillow: .venv/bin/pip install pillow
"""
import json
import os
import urllib.request

from PIL import Image, ImageDraw, ImageFont

from database import SessionLocal
from models import Book

MET_API = 'https://collectionapi.metmuseum.org/public/collection/v1/objects/'
DOWNLOAD_DIR = 'data/covers'
COVERS_DIR = 'media/covers'

# title -> (Met object id, crop box as parts of the width/height: left, top, right, bottom; None = whole page)
COVERS = {
    'Гулистон': (452847, (0.16, 0.08, 0.92, 0.83)),             # "Dancing Dervishes", folio from a Gulistan of Sa'di
    'Бӯстон': (452672, (0.26, 0.17, 0.90, 0.83)),               # "Yusuf and Zulaikha", folio from a Bustan of Sa'di
    'Шоҳнома': (452126, (0.10, 0.22, 0.68, 0.80)),              # "Rustam's Fourth Course", Shahnama of Shah Tahmasp
    'Шоҳнома (достонҳои интихобӣ)': (452126, (0.10, 0.22, 0.68, 0.80)),
    'Девони ғазалиёт': (446892, (0.35, 0.18, 0.92, 0.79)),      # "Dancing Dervishes", folio from a Divan of Hafiz
    'Маснавии маънавӣ. Дафтари аввал': (446547, (0.17, 0.02, 0.97, 0.98)),  # Masnavi of Jalal al-Din Rumi
    'Рубоиёт': (447798, None),                                   # Reza Abbasi, "The Old Man and the Youth"
    'Ашъор': (453077, None),                                     # folio from a Kalila wa Dimna (Rudaki versified it)
    'Бӯи Ҷӯи Мӯлиён': (453077, None),
}

MAX_WIDTH = 600

# title -> (art file, crop of the book, title panel, lettering, title text, author text); boxes are parts of the image
# lettering: "dark" = dark brown letters on a gold panel, "gold" = gold letters on leather
TAJIK_COVERS = {
    'Гулистон': ('golestan.jpg', (0.065, 0.05, 0.94, 0.955), (0.335, 0.633, 0.681, 0.733), 'dark', 'ГУЛИСТОН', 'Саъдии Шерозӣ'),
    'Бӯстон': ('boostan.jpg', (0.08, 0.07, 0.92, 0.95), (0.29, 0.54, 0.76, 0.79), 'gold', 'БӮСТОН', 'Саъдии Шерозӣ'),
}

INKS = {
    'dark': {'text': (58, 34, 6), 'edge': (255, 226, 150)},     # pressed into gold
    'gold': {'text': (236, 196, 108), 'edge': (40, 24, 4)},     # gold foil on leather
}


def download(object_id):
    """The museum's image of one object, saved once in data/covers/."""
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    path = f'{DOWNLOAD_DIR}/{object_id}.jpg'
    if not os.path.exists(path):
        request = urllib.request.Request(MET_API + str(object_id), headers={'User-Agent': 'Shunav (student project)'})
        with urllib.request.urlopen(request, timeout=60) as response:
            info = json.load(response)
        if not info.get('isPublicDomain'):
            raise ValueError(f'Met object {object_id} is not public domain')
        urllib.request.urlretrieve(info['primaryImageSmall'], path)
    return path


def make_cover(object_id, crop):
    """Crop and resize the painting; returns the URL of the saved cover."""
    os.makedirs(COVERS_DIR, exist_ok=True)
    image = Image.open(download(object_id)).convert('RGB')

    if crop:
        width, height = image.size
        left, top, right, bottom = crop
        image = image.crop((int(left * width), int(top * height), int(right * width), int(bottom * height)))

    if image.width > MAX_WIDTH:
        image = image.resize((MAX_WIDTH, round(image.height * MAX_WIDTH / image.width)), Image.LANCZOS)

    name = f'met-{object_id}-{"crop" if crop else "full"}.jpg'
    image.save(f'{COVERS_DIR}/{name}', quality=85, optimize=True)
    return f'/{COVERS_DIR}/{name}'


def make_tajik_cover(art, crop, panel, lettering, title, author):
    """Write the title and author on the cover art, crop to the book and save; returns the URL."""
    os.makedirs(COVERS_DIR, exist_ok=True)
    image = Image.open(f'cover-art/{art}').convert('RGB')
    width, height = image.size
    draw = ImageDraw.Draw(image)

    left, top, right, bottom = (int(panel[0] * width), int(panel[1] * height), int(panel[2] * width), int(panel[3] * height))
    center = (left + right) / 2
    max_text_width = (right - left) * 0.86
    ink = INKS[lettering]

    def font_that_fits(text, file, size):
        while size > 12:
            font = ImageFont.truetype(f'fonts/{file}', size)
            if draw.textlength(text, font=font) <= max_text_width:
                return font
            size -= 2
        return ImageFont.truetype(f'fonts/{file}', 12)

    title_font = font_that_fits(title, 'Philosopher-Bold.ttf', int(width * 0.075))
    author_font = font_that_fits(author, 'Philosopher-Regular.ttf', int(title_font.size * 0.5))

    # the two lines together, in the middle of the panel
    gap = title_font.size * 0.35
    block_height = title_font.size + gap + author_font.size
    y = top + ((bottom - top) - block_height) / 2 - title_font.size * 0.1
    for text, font in ((title, title_font), (author, author_font)):
        x = center - draw.textlength(text, font=font) / 2
        draw.text((x + 1, y + 1), text, font=font, fill=ink['edge'])  # a thin edge, like pressed or foil letters
        draw.text((x, y), text, font=font, fill=ink['text'])
        y += font.size + gap

    image = image.crop((int(crop[0] * width), int(crop[1] * height), int(crop[2] * width), int(crop[3] * height)))
    if image.width > MAX_WIDTH:
        image = image.resize((MAX_WIDTH, round(image.height * MAX_WIDTH / image.width)), Image.LANCZOS)

    name = f'tajik-{art.rsplit(".", 1)[0]}.jpg'
    image.save(f'{COVERS_DIR}/{name}', quality=88, optimize=True)
    return f'/{COVERS_DIR}/{name}'


def cover_for(title):
    """The best cover we have for a book title (or None)."""
    if title in TAJIK_COVERS:
        return make_tajik_cover(*TAJIK_COVERS[title])
    if title in COVERS:
        return make_cover(*COVERS[title])
    return None


def apply_covers(db):
    for book in db.query(Book).all():
        cover = cover_for(book.title)
        if cover:
            book.cover = cover
            print(f'{book.title}: {book.cover}')
    db.commit()


if __name__ == '__main__':
    apply_covers(SessionLocal())
