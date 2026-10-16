import os
import uuid
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from config import MEDIA_DIR
from models import Book


def get_or_404(db: Session, model, pk: int):
    obj = db.get(model, pk)
    if obj is None:
        raise HTTPException(status_code=404, detail=f'{model.__name__} #{pk} not found')
    return obj


def get_visible_book(db: Session, book_id: int) -> Book:
    book = db.get(Book, book_id)
    if book is None or not book.is_published:
        raise HTTPException(status_code=404, detail=f'Book #{book_id} not found')
    return book


def save_file(file: UploadFile, folder: str, allowed_types: dict) -> str:
    extension = allowed_types.get(file.content_type)
    if extension is None:
        raise HTTPException(status_code=400, detail=f'File type {file.content_type} is not allowed')

    os.makedirs(f'{MEDIA_DIR}/{folder}', exist_ok=True)
    file_name = uuid.uuid4().hex + extension
    path = f'{MEDIA_DIR}/{folder}/{file_name}'

    with open(path, 'wb') as out:
        while chunk := file.file.read(1024 * 1024):  # 1 MB at a time, so big audio does not fill memory
            out.write(chunk)

    return '/' + path


def delete_file(url: str | None):
    if url:
        path = url.lstrip('/')
        if os.path.isfile(path):
            os.remove(path)


TAJIK_ALPHABET = 'абвгғдеёжзиӣйкқлмнопрстуӯфхҳчҷшъэюя'


def tajik_sort_key(text: str):
    """Sort words in Tajik alphabet order (SQLite would put Ё, Ғ, Ҳ ... in the wrong places)."""
    return [TAJIK_ALPHABET.find(letter) if letter in TAJIK_ALPHABET else 100 + ord(letter) for letter in text.lower()]


def text_contains(text: str | None, search: str) -> bool:
    """Case-insensitive search that also works for Cyrillic (SQLite's ilike only knows Latin letters)."""
    return search.lower() in (text or '').lower()
