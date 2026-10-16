from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_admin_user
from database import get_db
from models import Author, User
from schemas import AuthorCreate, AuthorRead
from utils import get_or_404

router = APIRouter(prefix='/authors', tags=['Authors'])


@router.get('', response_model=list[AuthorRead])
def list_authors(db: Session = Depends(get_db)):
    return db.query(Author).order_by(Author.name).all()


@router.get('/{pk}', response_model=AuthorRead)
def get_author(pk: int, db: Session = Depends(get_db)):
    return get_or_404(db, Author, pk)


@router.post('', response_model=AuthorRead, status_code=201)
def create_author(data: AuthorCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    author = Author(**data.model_dump())
    db.add(author)
    db.commit()
    db.refresh(author)
    return author


@router.put('/{pk}', response_model=AuthorRead)
def update_author(pk: int, data: AuthorCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    author = get_or_404(db, Author, pk)
    for key, value in data.model_dump().items():
        setattr(author, key, value)
    db.commit()
    db.refresh(author)
    return author


@router.delete('/{pk}', status_code=204)
def delete_author(pk: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    author = get_or_404(db, Author, pk)
    if author.books:
        raise HTTPException(status_code=400, detail='Delete or move its books first')
    db.delete(author)
    db.commit()
