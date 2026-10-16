from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_admin_user
from database import get_db
from models import Category, User
from schemas import CategoryCreate, CategoryRead
from utils import get_or_404

router = APIRouter(prefix='/categories', tags=['Categories'])


@router.get('', response_model=list[CategoryRead])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()


@router.get('/{pk}', response_model=CategoryRead)
def get_category(pk: int, db: Session = Depends(get_db)):
    return get_or_404(db, Category, pk)


@router.post('', response_model=CategoryRead, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    if db.query(Category).filter(Category.name == data.name).first():
        raise HTTPException(status_code=400, detail='Category already exists')
    category = Category(**data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put('/{pk}', response_model=CategoryRead)
def update_category(pk: int, data: CategoryCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    category = get_or_404(db, Category, pk)
    same_name = db.query(Category).filter(Category.name == data.name, Category.id != pk).first()
    if same_name:
        raise HTTPException(status_code=400, detail='Category already exists')
    for key, value in data.model_dump().items():
        setattr(category, key, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete('/{pk}', status_code=204)
def delete_category(pk: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    category = get_or_404(db, Category, pk)
    if category.books:
        raise HTTPException(status_code=400, detail='Delete or move its books first')
    db.delete(category)
    db.commit()
