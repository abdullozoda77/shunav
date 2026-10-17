"""Author portraits from Wikimedia Commons (public domain, one CC BY 3.0 photo with its author named).

    .venv/bin/python portraits.py

Each picture is downloaded once (data/portraits/), cropped to the face and saved as media/authors/<name>.jpg.
Needs Pillow.
"""
import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image
from sqlalchemy import inspect, text

from database import SessionLocal, engine
from models import Author

COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
DOWNLOAD_DIR = 'data/portraits'
PHOTOS_DIR = 'media/authors'

# author name -> (Commons file, crop box as parts of width/height: left, top, right, bottom, credit)
PORTRAITS = {
    'Садриддин Айнӣ': ('AyniSadriddin.jpg', (0.16, 0.03, 0.88, 0.60),
                        'Photo before 1952, public domain (Wikimedia Commons)'),
    'Абӯабдуллоҳи Рӯдакӣ': ('Miniature of Rudaki by Hossein Behzad.jpg', (0.44, 0.26, 0.78, 0.58),
                            'Hossein Behzad, public domain (Wikimedia Commons)'),
    'Абулқосим Фирдавсӣ': ('Imaginary depiction of the poet Firdausi. Folio from a Khavarannama (The Book of the East) '
                           'of ibn Husam al-Din, 1476-1486 (cropped).jpg', (0.08, 0.02, 0.85, 0.62),
                           'Khavarannama, 1476–86, public domain (Wikimedia Commons)'),
    'Саъдии Шерозӣ': ('Saadi by Hossein Behzad (1894–1968) (Inverted).jpg', (0.37, 0.17, 0.70, 0.43),
                      'Hossein Behzad, public domain (Wikimedia Commons)'),
    'Ҳофизи Шерозӣ': ('Anselm Feuerbach Hafis vor der Schenke (cropped).jpg', (0.00, 0.03, 0.80, 0.70),
                      'Anselm Feuerbach, public domain (Wikimedia Commons)'),
    'Умари Хайём': ('Hakim Omar Khayam - panoramio.jpg', (0.40, 0.00, 0.96, 0.48),
                    'Photo: Alireza Javaheri, CC BY 3.0 (Wikimedia Commons)'),
    'Ҷалолиддини Балхӣ (Румӣ)': ('مولانا اثر حسین بهزاد (cropped).jpg', (0.28, 0.12, 0.66, 0.55),
                                 'Hossein Behzad, public domain (Wikimedia Commons)'),
}

SIZE = (400, 500)  # 4:5, shown in round and oval frames


def download(file_name):
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    path = f'{DOWNLOAD_DIR}/{hashlib.md5(file_name.encode()).hexdigest()}.jpg'
    if not os.path.exists(path):
        query = urllib.parse.urlencode({
            'action': 'query', 'titles': f'File:{file_name}', 'prop': 'imageinfo',
            'iiprop': 'url', 'iiurlwidth': 600, 'format': 'json',
        })
        page = next(iter(json.loads(fetch(f'{COMMONS_API}?{query}'))['query']['pages'].values()))
        with open(path, 'wb') as f:
            f.write(fetch(page['imageinfo'][0]['thumburl']))
        time.sleep(2)  # Wikimedia asks to go slowly
    return path


def fetch(url):
    """GET with a few retries: Wikimedia answers 429 (too many requests) if we are fast."""
    request = urllib.request.Request(url, headers={'User-Agent': 'Shunav audiobooks (student project)'})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 4:
                raise
            time.sleep(10 * (attempt + 1))


def make_photo(file_name, crop, slug):
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    image = Image.open(download(file_name)).convert('RGB')
    width, height = image.size
    left, top, right, bottom = crop
    image = image.crop((int(left * width), int(top * height), int(right * width), int(bottom * height)))

    # fill a 4:5 frame (cut the extra from the sides or the bottom)
    target = SIZE[0] / SIZE[1]
    if image.width / image.height > target:
        new_width = int(image.height * target)
        x = (image.width - new_width) // 2
        image = image.crop((x, 0, x + new_width, image.height))
    else:
        image = image.crop((0, 0, image.width, int(image.width / target)))
    image = image.resize(SIZE, Image.LANCZOS)

    image.save(f'{PHOTOS_DIR}/{slug}.jpg', quality=88, optimize=True)
    return f'/{PHOTOS_DIR}/{slug}.jpg'


def add_photo_columns():
    """The authors table was made before these columns existed; SQLite needs them added by hand."""
    columns = [column['name'] for column in inspect(engine).get_columns('authors')]
    with engine.begin() as connection:
        for name in ('photo', 'photo_credit'):
            if name not in columns:
                connection.execute(text(f'ALTER TABLE authors ADD COLUMN {name} VARCHAR'))


def main():
    add_photo_columns()
    db = SessionLocal()
    for number, (name, (file_name, crop, credit)) in enumerate(PORTRAITS.items(), start=1):
        author = db.query(Author).filter(Author.name == name).first()
        if author is None:  # not imported yet: create it with the same details import_books.py uses
            from import_books import AUTHORS
            info = next((info for info in AUTHORS.values() if info['name'] == name), {'name': name})
            author = Author(**info)
            db.add(author)
        author.photo = make_photo(file_name, crop, f'author-{number}')
        author.photo_credit = credit
        print(f'{name}: {author.photo}')
    db.commit()


if __name__ == '__main__':
    main()
