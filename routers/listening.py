from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Bookmark, Chapter, Favorite, ListeningProgress, Review, User
from schemas import ContinueItem, ProgressRead, ProgressSave, StatsRead
from utils import get_or_404, get_visible_book

router = APIRouter(tags=['Listening'])

FINISHED_GAP = 10


@router.post('/progress', response_model=ProgressRead)
def save_progress(data: ProgressSave, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """The player calls this every 10-15 seconds with the current position."""
    chapter = get_or_404(db, Chapter, data.chapter_id)
    get_visible_book(db, chapter.book_id)

    position = data.position_seconds
    if chapter.duration_seconds and position > chapter.duration_seconds:
        position = chapter.duration_seconds

    progress = db.query(ListeningProgress).filter(
        ListeningProgress.user_id == current_user.id,
        ListeningProgress.chapter_id == chapter.id,
    ).first()

    if progress is None:  # first time in this chapter
        progress = ListeningProgress(user_id=current_user.id, chapter_id=chapter.id)
        db.add(progress)

    progress.position_seconds = position
    db.commit()
    db.refresh(progress)
    return progress


@router.get('/books/{book_id}/progress', response_model=list[ProgressRead])
def book_progress(book_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Position in every chapter of one book (for progress bars in the chapter list)."""
    get_visible_book(db, book_id)
    return (
        db.query(ListeningProgress)
        .join(Chapter)
        .filter(ListeningProgress.user_id == current_user.id, Chapter.book_id == book_id)
        .order_by(Chapter.order)
        .all()
    )


@router.get('/me/continue', response_model=list[ContinueItem])
def continue_listening(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """The last chapter the user listened to in each book, newest first."""
    rows = (
        db.query(ListeningProgress)
        .filter(ListeningProgress.user_id == current_user.id)
        .order_by(ListeningProgress.updated_at.desc(), ListeningProgress.id.desc())
        .all()
    )

    result = []
    seen_books = set()
    for row in rows:
        book = row.chapter.book
        if book.id in seen_books or not book.is_published:
            continue
        seen_books.add(book.id)
        result.append({'book': book, 'chapter': row.chapter, 'position_seconds': row.position_seconds})

    return result[:10]


@router.get('/me/stats', response_model=StatsRead)
def my_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(ListeningProgress).filter(ListeningProgress.user_id == current_user.id).all()

    listened_seconds = sum(row.position_seconds for row in rows)

    finished_chapters = {}
    for row in rows:
        chapter = row.chapter
        if chapter.duration_seconds and row.position_seconds >= chapter.duration_seconds - FINISHED_GAP:
            finished_chapters.setdefault(chapter.book, 0)
            finished_chapters[chapter.book] += 1

    books_finished = sum(1 for book, count in finished_chapters.items() if count == len(book.chapters))
    books_started = len({row.chapter.book_id for row in rows})

    def count(model):
        return db.query(func.count(model.id)).filter(model.user_id == current_user.id).scalar()

    return {
        'listened_seconds': listened_seconds,
        'books_started': books_started,
        'books_finished': books_finished,
        'bookmarks': count(Bookmark),
        'favorites': count(Favorite),
        'reviews': count(Review),
    }
