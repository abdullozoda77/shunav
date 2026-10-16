from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Bookmark, Chapter, User
from schemas import BookmarkCreate, BookmarkRead
from utils import get_or_404, get_visible_book

router = APIRouter(prefix='/me/bookmarks', tags=['Bookmarks'])


@router.get('', response_model=list[BookmarkRead])
def my_bookmarks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Bookmark).filter(Bookmark.user_id == current_user.id).order_by(Bookmark.id.desc()).all()


@router.post('', response_model=BookmarkRead, status_code=201)
def add_bookmark(data: BookmarkCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    chapter = get_or_404(db, Chapter, data.chapter_id)
    get_visible_book(db, chapter.book_id)

    bookmark = Bookmark(user_id=current_user.id, **data.model_dump())
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return bookmark


@router.delete('/{bookmark_id}', status_code=204)
def delete_bookmark(bookmark_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bookmark = db.get(Bookmark, bookmark_id)
    if bookmark is None or bookmark.user_id != current_user.id:
        raise HTTPException(status_code=404, detail=f'Bookmark #{bookmark_id} not found')

    db.delete(bookmark)
    db.commit()
