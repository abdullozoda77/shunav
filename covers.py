"""Book covers: real Persian miniatures from The Metropolitan Museum of Art (Open Access, public domain / CC0).

    .venv/bin/python covers.py

Each painting is downloaded once (data/covers/), cropped to the painted part of the page and saved as
media/covers/<id>.jpg. Books are matched by title, so run it again after import_books.py replaces a book.
Needs Pillow: .venv/bin/pip install pillow
"""
import json
import os
import urllib.request

from PIL import Image

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


def apply_covers(db):
    for book in db.query(Book).all():
        if book.title not in COVERS:
            continue
        object_id, crop = COVERS[book.title]
        book.cover = make_cover(object_id, crop)
        print(f'{book.title}: {book.cover}')
    db.commit()


if __name__ == '__main__':
    apply_covers(SessionLocal())
