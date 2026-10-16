import os
import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from config import MEDIA_DIR
from models import Book


def get_or_404(db: Session, model, pk: int):
    """Find a row by id or answer 404."""
    obj = db.get(model, pk)
    if obj is None:
        raise HTTPException(status_code=404, detail=f'{model.__name__} #{pk} not found')
    return obj


def get_visible_book(db: Session, book_id: int) -> Book:
    """A book that normal users may see (hidden books answer 404)."""
    book = db.get(Book, book_id)
    if book is None or not book.is_published:
        raise HTTPException(status_code=404, detail=f'Book #{book_id} not found')
    return book


def save_file(file: UploadFile, folder: str, allowed_types: dict) -> str:
    """Save an uploaded file to media/<folder>/ and return its URL."""
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
    """Remove a file saved by save_file (if it is still there)."""
    if url:
        path = url.lstrip('/')
        if os.path.isfile(path):
            os.remove(path)
