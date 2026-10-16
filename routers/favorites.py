from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Favorite, User
from schemas import FavoriteRead
from utils import get_visible_book

router = APIRouter(tags=['Favorites'])


def find_favorite(db: Session, user_id: int, book_id: int):
    return db.query(Favorite).filter(Favorite.user_id == user_id, Favorite.book_id == book_id).first()


@router.get('/me/favorites', response_model=list[FavoriteRead])
def my_favorites(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Favorite).filter(Favorite.user_id == current_user.id).order_by(Favorite.id.desc()).all()


@router.post('/books/{book_id}/favorite', response_model=FavoriteRead, status_code=201)
def add_favorite(book_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_visible_book(db, book_id)
    if find_favorite(db, current_user.id, book_id):
        raise HTTPException(status_code=400, detail='Book is already in favorites')

    favorite = Favorite(user_id=current_user.id, book_id=book_id)
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


@router.delete('/books/{book_id}/favorite', status_code=204)
def remove_favorite(book_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    favorite = find_favorite(db, current_user.id, book_id)
    if favorite is None:
        raise HTTPException(status_code=404, detail='Book is not in favorites')

    db.delete(favorite)
    db.commit()
