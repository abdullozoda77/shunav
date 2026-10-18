from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth import get_admin_user
from config import AUDIO_TYPES
from database import get_db
from models import Book, Chapter, User
from schemas import ChapterCreate, ChapterOrder, ChapterRead, ChapterShort, ChapterUpdate
from utils import delete_file, get_or_404, get_visible_book, save_file

router = APIRouter(tags=['Chapters'])


def order_is_taken(db: Session, book_id: int, order: int) -> bool:
    return db.query(Chapter).filter(Chapter.book_id == book_id, Chapter.order == order).first() is not None


@router.get('/books/{book_id}/chapters', response_model=list[ChapterShort])
def list_chapters(book_id: int, db: Session = Depends(get_db)):
    book = get_visible_book(db, book_id)
    return book.chapters  # already sorted by order


@router.get('/chapters/{chapter_id}', response_model=ChapterRead)
def get_chapter(chapter_id: int, db: Session = Depends(get_db)):
    """One chapter with its full text (for the reader) and audio URL (for the player)."""
    chapter = get_or_404(db, Chapter, chapter_id)
    get_visible_book(db, chapter.book_id)
    return chapter


@router.post('/books/{book_id}/chapters', response_model=ChapterRead, status_code=201)
def add_chapter(book_id: int, data: ChapterCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    get_or_404(db, Book, book_id)
    if order_is_taken(db, book_id, data.order):
        raise HTTPException(status_code=400, detail=f'Chapter #{data.order} already exists in this book')

    chapter = Chapter(book_id=book_id, **data.model_dump())
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter


@router.patch('/chapters/{chapter_id}', response_model=ChapterRead)
def update_chapter(chapter_id: int, data: ChapterUpdate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    chapter = get_or_404(db, Chapter, chapter_id)

    if data.order is not None and data.order != chapter.order and order_is_taken(db, chapter.book_id, data.order):
        raise HTTPException(status_code=400, detail=f'Chapter #{data.order} already exists in this book')

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(chapter, key, value)

    db.commit()
    db.refresh(chapter)
    return chapter


@router.put('/books/{book_id}/chapters/order', response_model=list[ChapterShort])
def reorder_chapters(book_id: int, data: ChapterOrder, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    """Drag-and-drop in the admin: send all chapter ids in the new order."""
    book = get_or_404(db, Book, book_id)

    current_ids = sorted(chapter.id for chapter in book.chapters)
    if sorted(data.chapter_ids) != current_ids:
        raise HTTPException(status_code=400, detail='Send every chapter id of this book exactly once')

    chapters = {chapter.id: chapter for chapter in book.chapters}

    for chapter in book.chapters:
        chapter.order = chapter.order + 100000
    db.flush()

    for number, chapter_id in enumerate(data.chapter_ids, start=1):
        chapters[chapter_id].order = number

    db.commit()
    db.refresh(book)
    return book.chapters


@router.delete('/chapters/{chapter_id}', status_code=204)
def delete_chapter(chapter_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    chapter = get_or_404(db, Chapter, chapter_id)
    delete_file(chapter.audio_file)
    db.delete(chapter)
    db.commit()


@router.post('/chapters/{chapter_id}/audio', response_model=ChapterRead)
def upload_audio(
    chapter_id: int,
    file: UploadFile = File(...),
    duration_seconds: int = Form(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    chapter = get_or_404(db, Chapter, chapter_id)

    new_audio = save_file(file, 'audio', AUDIO_TYPES)
    delete_file(chapter.audio_file)  # the old one

    chapter.audio_file = new_audio
    chapter.duration_seconds = duration_seconds
    chapter.audio_status = 'done'

    db.commit()
    db.refresh(chapter)
    return chapter
