"""Book covers.

0. Photos of real Tajik editions (PHOTO_COVERS, files in cover-photos/). These belong to their publishers:
   fine for this project, but ask the publisher before putting the site online for everyone.
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

# title -> photo in cover-photos/ (sent by the project owner)
PHOTO_COVERS = {
    'Шоҳнома': 'shohnoma.jpg',
    'Шоҳнома (достонҳои интихобӣ)': 'shohnoma.jpg',
    'Маснавии маънавӣ. Дафтари аввал': 'masnavi.jpg',
    'Рубоиёт': 'rubaiyat.jpg',
    'Девони ғазалиёт': 'hafez.jpg',
}

# title -> (portrait in cover-photos/, title text, author text): a picture that is not a book cover is put on one
PORTRAIT_COVERS = {
    'Ашъор': ('rudaki.jpg', 'АШЪОР', 'Абӯабдуллоҳи Рӯдакӣ'),
    'Бӯи Ҷӯи Мӯлиён': ('rudaki.jpg', 'БӮИ ҶӮИ МӮЛИЁН', 'Абӯабдуллоҳи Рӯдакӣ'),
}

INKS = {
    'dark': {'text': (58, 34, 6), 'edge': (255, 226, 150)},     # pressed into gold
    'gold': {'text': (236, 196, 108), 'edge': (40, 24, 4)},     # gold foil on leather
}


# Philosopher has no Ҳ/ҳ: those letters are drawn with PT Serif (same size and weight)
MISSING_IN_PHILOSOPHER = set('Ҳҳ')
FALLBACK_FONT = {'Philosopher-Bold.ttf': 'PTSerif-Bold.ttf', 'Philosopher-Regular.ttf': 'PTSerif-Regular.ttf'}


def load_font(file, size):
    """(font, fallback font) pair for writing Tajik text."""
    return ImageFont.truetype(f'fonts/{file}', size), ImageFont.truetype(f'fonts/{FALLBACK_FONT[file]}', size)


def text_width(draw, text, fonts):
    font, fallback = fonts
    return sum(draw.textlength(letter, font=fallback if letter in MISSING_IN_PHILOSOPHER else font) for letter in text)


def write(draw, x, y, text, fonts, fill):
    """Write text letter by letter, taking each letter from the font that has it."""
    font, fallback = fonts
    for letter in text:
        letter_font = fallback if letter in MISSING_IN_PHILOSOPHER else font
        draw.text((x, y), letter, font=letter_font, fill=fill)
        x += draw.textlength(letter, font=letter_font)


def fitting_fonts(draw, text, file, size, max_width):
    """The biggest size (from `size` down) at which the text fits in max_width."""
    while size > 12 and text_width(draw, text, load_font(file, size)) > max_width:
        size -= 2
    return load_font(file, size)


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

    title_fonts = fitting_fonts(draw, title, 'Philosopher-Bold.ttf', int(width * 0.075), max_text_width)
    author_fonts = fitting_fonts(draw, author, 'Philosopher-Regular.ttf', int(title_fonts[0].size * 0.5), max_text_width)

    # the two lines together, in the middle of the panel
    gap = title_fonts[0].size * 0.35
    block_height = title_fonts[0].size + gap + author_fonts[0].size
    y = top + ((bottom - top) - block_height) / 2 - title_fonts[0].size * 0.1
    for text, fonts in ((title, title_fonts), (author, author_fonts)):
        x = center - text_width(draw, text, fonts) / 2
        write(draw, x + 1, y + 1, text, fonts, ink['edge'])  # a thin edge, like pressed or foil letters
        write(draw, x, y, text, fonts, ink['text'])
        y += fonts[0].size + gap

    image = image.crop((int(crop[0] * width), int(crop[1] * height), int(crop[2] * width), int(crop[3] * height)))
    if image.width > MAX_WIDTH:
        image = image.resize((MAX_WIDTH, round(image.height * MAX_WIDTH / image.width)), Image.LANCZOS)

    name = f'tajik-{art.rsplit(".", 1)[0]}.jpg'
    image.save(f'{COVERS_DIR}/{name}', quality=88, optimize=True)
    return f'/{COVERS_DIR}/{name}'


def make_photo_cover(file_name):
    """A photo of a real edition: just resized and saved; returns the URL."""
    os.makedirs(COVERS_DIR, exist_ok=True)
    image = Image.open(f'cover-photos/{file_name}').convert('RGB')
    if image.width > MAX_WIDTH:
        image = image.resize((MAX_WIDTH, round(image.height * MAX_WIDTH / image.width)), Image.LANCZOS)
    name = f'photo-{file_name}'
    image.save(f'{COVERS_DIR}/{name}', quality=90, optimize=True)
    return f'/{COVERS_DIR}/{name}'


def make_portrait_cover(file_name, title, author):
    """Dark-brown book with a gold frame: the portrait on top, the title and author below; returns the URL."""
    os.makedirs(COVERS_DIR, exist_ok=True)
    width, height = 600, 880
    leather, gold = (52, 32, 20), (226, 182, 96)
    cover = Image.new('RGB', (width, height), leather)
    draw = ImageDraw.Draw(cover)

    # two thin gold frames
    draw.rectangle((18, 18, width - 19, height - 19), outline=gold, width=3)
    draw.rectangle((30, 30, width - 31, height - 31), outline=gold, width=1)

    # the portrait, in a gold frame
    portrait = Image.open(f'cover-photos/{file_name}').convert('RGB')
    portrait_width = width - 120
    portrait = portrait.resize((portrait_width, round(portrait.height * portrait_width / portrait.width)), Image.LANCZOS)
    top = 70
    cover.paste(portrait, (60, top))
    draw.rectangle((56, top - 4, 60 + portrait_width + 3, top + portrait.height + 3), outline=gold, width=3)

    # title and author in the middle of the space under the portrait
    title_fonts = fitting_fonts(draw, title, 'Philosopher-Bold.ttf', 62, width - 120)
    author_fonts = fitting_fonts(draw, author, 'Philosopher-Regular.ttf', 32, width - 120)
    gap = 20
    space_top, space_bottom = top + portrait.height + 4, height - 31
    y = space_top + ((space_bottom - space_top) - (title_fonts[0].size + gap + author_fonts[0].size)) / 2
    for text, fonts in ((title, title_fonts), (author, author_fonts)):
        write(draw, (width - text_width(draw, text, fonts)) / 2, y, text, fonts, gold)
        y += fonts[0].size + gap

    name = f'portrait-{title.lower().replace(" ", "-")}.jpg'
    cover.save(f'{COVERS_DIR}/{name}', quality=90, optimize=True)
    return f'/{COVERS_DIR}/{name}'


def cover_for(title):
    """The best cover we have for a book title (or None): photo, then Tajik-style art, then museum painting."""
    if title in PHOTO_COVERS:
        return make_photo_cover(PHOTO_COVERS[title])
    if title in PORTRAIT_COVERS:
        return make_portrait_cover(*PORTRAIT_COVERS[title])
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
