from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from auth import get_admin_user
from config import IMAGE_TYPES
from database import get_db
from models import Author, Book, Category, Narrator, User
from schemas import BookCreate, BookDetail, BookRead, BookUpdate, Language, LicenseType
from utils import delete_file, get_or_404, get_visible_book, matches_search, save_file, tajik_sort_key

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
    # Search
    search: str | None = Query(None, min_length=1, description='Book title, author or genre, in Tajik, Russian or English'),

    # Filter
    author_id: int | None = Query(None, ge=1),
    category_id: int | None = Query(None, ge=1),
    narrator_id: int | None = Query(None, ge=1),
    language: Language | None = None,
    license_type: LicenseType | None = None,
    min_rating: float | None = Query(None, ge=0, le=5),

    # Pagination
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),

    # Sorting
    sort_by: Literal['id', 'title', 'created_at', 'rating'] = 'id',
    order: Literal['asc', 'desc'] = 'desc',

    db: Session = Depends(get_db)
):
    query = db.query(Book).join(Author).filter(Book.is_published.is_(True))

    # Filter
    if author_id is not None:
        query = query.filter(Book.author_id == author_id)

    if category_id is not None:
        query = query.filter(Book.category_id == category_id)

    if narrator_id is not None:
        query = query.filter(Book.narrator_id == narrator_id)

    if language is not None:
        query = query.filter(Book.language == language)

    if license_type is not None:
        query = query.filter(Book.license_type == license_type)

    # Sorting
    sort_columns = {
        'id': Book.id,
        'title': Book.title,
        'created_at': Book.created_at,
    }
    column = sort_columns.get(sort_by, Book.id)

    if order == 'desc':
        query = query.order_by(column.desc())
    else:
        query = query.order_by(column.asc())

    books = query.all()

    # Search (in Python: any case, any language, Tajik letters or not; see utils.matches_search)
    if search is not None:
        books = [
            book for book in books
            if matches_search(search, book.title, book.author.name, book.category.name if book.category else None)
        ]

    # Rating is counted in Python (see Book.average_rating), so it is filtered and sorted here
    if min_rating is not None:
        books = [book for book in books if book.average_rating >= min_rating]

    if sort_by == 'rating':
        books.sort(key=lambda book: (book.average_rating, book.reviews_count), reverse=(order == 'desc'))

    if sort_by == 'title':  # Tajik alphabet order
        books.sort(key=lambda book: tajik_sort_key(book.title), reverse=(order == 'desc'))

    # Pagination
    skip = (page - 1) * page_size
    return books[skip:skip + page_size]


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
