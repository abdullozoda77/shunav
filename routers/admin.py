from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_admin_user
from database import get_db
from models import Book, Chapter, CopyrightReport, User
from schemas import BookDetail, BookRead, UserRead
from utils import get_or_404

router = APIRouter(prefix='/admin', tags=['Admin'])


@router.get('/books', response_model=list[BookRead])
def all_books(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(Book).order_by(Book.id.desc()).all()


@router.get('/books/{book_id}', response_model=BookDetail)
def any_book(book_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return get_or_404(db, Book, book_id)


@router.get('/users', response_model=list[UserRead])
def all_users(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(User).order_by(User.id.desc()).all()


@router.patch('/users/{user_id}/block', response_model=UserRead)
def block_user(user_id: int, blocked: bool = True, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    user = get_or_404(db, User, user_id)
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail='You cannot block yourself')
    user.is_active = not blocked
    db.commit()
    db.refresh(user)
    return user


@router.get('/stats')
def site_stats(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return {
        'users': db.query(func.count(User.id)).scalar(),
        'books': db.query(func.count(Book.id)).scalar(),
        'published_books': db.query(func.count(Book.id)).filter(Book.is_published.is_(True)).scalar(),
        'chapters': db.query(func.count(Chapter.id)).scalar(),
        'chapters_without_audio': db.query(func.count(Chapter.id)).filter(Chapter.audio_status != 'done').scalar(),
        'new_reports': db.query(func.count(CopyrightReport.id)).filter(CopyrightReport.status == 'new').scalar(),
    }
