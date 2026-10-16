from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Review, User
from schemas import RatingRead, ReviewCreate, ReviewRead
from utils import get_or_404, get_visible_book

router = APIRouter(tags=['Reviews'])


@router.get('/books/{book_id}/reviews', response_model=list[ReviewRead])
def book_reviews(book_id: int, db: Session = Depends(get_db)):
    get_visible_book(db, book_id)
    return db.query(Review).filter(Review.book_id == book_id).order_by(Review.id.desc()).all()


@router.get('/books/{book_id}/rating', response_model=RatingRead)
def book_rating(book_id: int, db: Session = Depends(get_db)):
    get_visible_book(db, book_id)
    average, count = db.query(func.avg(Review.rating), func.count(Review.id)).filter(Review.book_id == book_id).one()
    return {'average': round(average or 0, 2), 'count': count}


@router.post('/books/{book_id}/reviews', response_model=ReviewRead, status_code=201)
def add_review(book_id: int, data: ReviewCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_visible_book(db, book_id)

    already = db.query(Review).filter(Review.user_id == current_user.id, Review.book_id == book_id).first()
    if already:
        raise HTTPException(status_code=400, detail='You already reviewed this book')

    review = Review(user_id=current_user.id, book_id=book_id, **data.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.put('/reviews/{review_id}', response_model=ReviewRead)
def edit_review(review_id: int, data: ReviewCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    review = get_or_404(db, Review, review_id)
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail='You can edit only your own review')

    review.rating = data.rating
    review.text = data.text
    db.commit()
    db.refresh(review)
    return review


@router.delete('/reviews/{review_id}', status_code=204)
def delete_review(review_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    review = get_or_404(db, Review, review_id)
    if review.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail='You can delete only your own review')

    db.delete(review)
    db.commit()
