from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import hash_password, verify_password, create_access_token, get_current_user
from database import get_db
from models import User
from schemas import UserCreate, UserRead, UserUpdate, LoginSchema, TokenSchema

router = APIRouter(tags=['Auth'])


@router.post('/register', response_model=UserRead, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    username = data.username.strip().lower()
    email = data.email.lower()

    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail='Username already exists')
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail='Email already exists')

    user = User(
        name=data.name,
        username=username,
        email=email,
        preferred_language=data.preferred_language,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post('/login', response_model=TokenSchema)
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username.strip().lower()).first()

    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Invalid username or password')

    return {'access_token': create_access_token(user.id), 'token_type': 'bearer'}


@router.get('/me', response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch('/me', response_model=UserRead)
def update_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.name is not None:
        current_user.name = data.name
    if data.preferred_language is not None:
        current_user.preferred_language = data.preferred_language
    db.commit()
    db.refresh(current_user)
    return current_user
