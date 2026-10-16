from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from auth import get_admin_user
from config import IMAGE_TYPES
from database import get_db
from models import Author, Book, Category, Narrator, User
from schemas import BookCreate, BookDetail, BookRead, BookUpdate, Language
from utils import delete_file, get_or_404, get_visible_book, save_file

router = APIRouter(prefix='/books', tags=['Books'])


def check_links(db: Session, data):
    """Author, category and narrator must exist."""
    if data.author_id is not None:
        get_or_404(db, Author, data.author_id)
    if data.category_id is not None:
        get_or_404(db, Category, data.category_id)
    if data.narrator_id is not None:
        get_or_404(db, Narrator, data.narrator_id)


@router.get('', response_model=list[BookRead])
def list_books(
    search: str | None = Query(None, description='Book title or author name'),
    author_id: int | None = None,
    category_id: int | None = None,
    language: Language | None = None,
    sort: Literal['newest', 'title', 'rating'] = 'newest',
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Book).join(Author).filter(Book.is_published.is_(True))

    if search:
        query = query.filter(Book.title.ilike(f'%{search}%') | Author.name.ilike(f'%{search}%'))
    if author_id:
        query = query.filter(Book.author_id == author_id)
    if category_id:
        query = query.filter(Book.category_id == category_id)
    if language:
        query = query.filter(Book.language == language)

    if sort == 'title':
        query = query.order_by(Book.title)
    else:
        query = query.order_by(Book.id.desc())

    books = query.all()
    if sort == 'rating':  # rating is counted in Python (see Book.average_rating)
        books.sort(key=lambda book: (book.average_rating, book.reviews_count), reverse=True)

    return books[skip:skip + limit]


@router.get('/{book_id}', response_model=BookDetail)
def get_book(book_id: int, db: Session = Depends(get_db)):
    return get_visible_book(db, book_id)


@router.post('', response_model=BookDetail, status_code=201)
def create_book(data: BookCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    check_links(db, data)
    book = Book(**data.model_dump())
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.patch('/{book_id}', response_model=BookDetail)
def update_book(book_id: int, data: BookUpdate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    book = get_or_404(db, Book, book_id)
    check_links(db, data)

    # only the fields that were sent
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(book, key, value)

    db.commit()
    db.refresh(book)
    return book


@router.delete('/{book_id}', status_code=204)
def delete_book(book_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    book = get_or_404(db, Book, book_id)

    delete_file(book.cover)
    for chapter in book.chapters:
        delete_file(chapter.audio_file)

    db.delete(book)
    db.commit()


@router.post('/{book_id}/cover', response_model=BookDetail)
def upload_cover(
    book_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    book = get_or_404(db, Book, book_id)

    new_cover = save_file(file, 'covers', IMAGE_TYPES)
    delete_file(book.cover)  # the old one
    book.cover = new_cover

    db.commit()
    db.refresh(book)
    return book
