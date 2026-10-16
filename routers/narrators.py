from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_admin_user
from database import get_db
from models import Narrator, User
from schemas import NarratorCreate, NarratorRead
from utils import get_or_404

router = APIRouter(prefix='/narrators', tags=['Narrators'])


@router.get('', response_model=list[NarratorRead])
def list_narrators(db: Session = Depends(get_db)):
    return db.query(Narrator).order_by(Narrator.name).all()


@router.get('/{pk}', response_model=NarratorRead)
def get_narrator(pk: int, db: Session = Depends(get_db)):
    return get_or_404(db, Narrator, pk)


@router.post('', response_model=NarratorRead, status_code=201)
def create_narrator(data: NarratorCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    narrator = Narrator(**data.model_dump())
    db.add(narrator)
    db.commit()
    db.refresh(narrator)
    return narrator


@router.put('/{pk}', response_model=NarratorRead)
def update_narrator(pk: int, data: NarratorCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    narrator = get_or_404(db, Narrator, pk)
    for key, value in data.model_dump().items():
        setattr(narrator, key, value)
    db.commit()
    db.refresh(narrator)
    return narrator


@router.delete('/{pk}', status_code=204)
def delete_narrator(pk: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    narrator = get_or_404(db, Narrator, pk)
    if narrator.books:
        raise HTTPException(status_code=400, detail='Delete or move its books first')
    db.delete(narrator)
    db.commit()
