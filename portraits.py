"""Author portraits: lifelike 3D images made with Figma AI (artistic reconstructions — no photos of the
medieval poets exist). The files live in portraits/; this script copies them to media/authors/ and links
them to the authors.

    .venv/bin/python portraits.py
"""
import os
import shutil

from sqlalchemy import inspect, text

from database import SessionLocal, engine
from models import Author

SOURCE_DIR = 'portraits'
PHOTOS_DIR = 'media/authors'
CREDIT = '3D портрет, бо Figma AI сохта шудааст'

# author name -> picture in portraits/
PORTRAITS = {
    'Абӯабдуллоҳи Рӯдакӣ': 'rudaki.jpg',
    'Абулқосим Фирдавсӣ': 'ferdowsi.jpg',
    'Умари Хайём': 'khayyam.jpg',
    'Ҷалолиддини Балхӣ (Румӣ)': 'rumi.jpg',
    'Саъдии Шерозӣ': 'saadi.jpg',
    'Ҳофизи Шерозӣ': 'hafez.jpg',
    'Садриддин Айнӣ': 'ayni.jpg',
}


def add_photo_columns():
    """The authors table was made before these columns existed; SQLite needs them added by hand."""
    columns = [column['name'] for column in inspect(engine).get_columns('authors')]
    with engine.begin() as connection:
        for name in ('photo', 'photo_credit'):
            if name not in columns:
                connection.execute(text(f'ALTER TABLE authors ADD COLUMN {name} VARCHAR'))


def main():
    add_photo_columns()
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    db = SessionLocal()

    for name, file_name in PORTRAITS.items():
        author = db.query(Author).filter(Author.name == name).first()
        if author is None:  # not imported yet: create it with the same details import_books.py uses
            from import_books import AUTHORS
            info = next((info for info in AUTHORS.values() if info['name'] == name), {'name': name})
            author = Author(**info)
            db.add(author)

        shutil.copy(f'{SOURCE_DIR}/{file_name}', f'{PHOTOS_DIR}/{file_name}')
        author.photo = f'/{PHOTOS_DIR}/{file_name}'
        author.photo_credit = CREDIT
        print(f'{name}: {author.photo}')

    db.commit()


if __name__ == '__main__':
    main()
