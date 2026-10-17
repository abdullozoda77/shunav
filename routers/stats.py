from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Author, Book, Category, Chapter

router = APIRouter(tags=['Stats'])


@router.get('/stats')
def library_stats(db: Session = Depends(get_db)):
    """Numbers for the home page: how big the library is, and how many books each genre has."""
    books = db.query(Book).filter(Book.is_published.is_(True)).all()

    genres = []
    for category in db.query(Category).order_by(Category.name).all():
        category_books = [book for book in books if book.category_id == category.id]
        if category_books:
            cover = next((book.cover for book in category_books if book.cover), None)
            genres.append({'id': category.id, 'name': category.name, 'books': len(category_books), 'cover': cover})

    return {
        'books': len(books),
        'authors': db.query(func.count(Author.id)).scalar(),
        'chapters': db.query(func.count(Chapter.id)).join(Book).filter(Book.is_published.is_(True)).scalar(),
        'audio_seconds': sum(book.total_duration for book in books),
        'genres': genres,
    }
