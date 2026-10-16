from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth import get_admin_user
from database import get_db
from models import Author, User
from schemas import AuthorCreate, AuthorRead
from utils import get_or_404, tajik_sort_key, text_contains

router = APIRouter(prefix='/authors', tags=['Authors'])


@router.get('', response_model=list[AuthorRead])
def list_authors(
    search: str | None = Query(None, min_length=1, description='Author name'),
    born_after: int | None = None,
    died_before: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    sort_by: Literal['id', 'name', 'birth_year', 'death_year'] = 'name',
    order: Literal['asc', 'desc'] = 'asc',
    db: Session = Depends(get_db)
):
    query = db.query(Author)

    # Filter
    if born_after is not None:
        query = query.filter(Author.birth_year >= born_after)

    if died_before is not None:
        query = query.filter(Author.death_year <= died_before)

    # Sorting
    sort_columns = {
        'id': Author.id,
        'name': Author.name,
        'birth_year': Author.birth_year,
        'death_year': Author.death_year,
    }
    column = sort_columns.get(sort_by, Author.name)

    if order == 'desc':
        query = query.order_by(column.desc())
    else:
        query = query.order_by(column.asc())

    authors = query.all()

    # Search (in Python, so Cyrillic upper/lower case works)
    if search is not None:
        authors = [author for author in authors if text_contains(author.name, search)]

    if sort_by == 'name':  # Tajik alphabet order
        authors.sort(key=lambda author: tajik_sort_key(author.name), reverse=(order == 'desc'))

    # Pagination
    skip = (page - 1) * page_size
    return authors[skip:skip + page_size]


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
