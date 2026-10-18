from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth import hash_password, verify_password, create_access_token, get_current_user
from config import IMAGE_TYPES
from database import get_db
from models import User
from schemas import UserCreate, UserRead, UserUpdate, LoginSchema, TokenSchema
from utils import delete_file, save_file

AVATAR_MAX_BYTES = 5 * 1024 * 1024

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


@router.post('/me/avatar', response_model=UserRead)
def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Profile photo: JPG, PNG or WEBP up to 5 MB. The old photo is deleted."""
    if file.size is not None and file.size > AVATAR_MAX_BYTES:
        raise HTTPException(status_code=400, detail='File is too large')
    new_avatar = save_file(file, 'avatars', IMAGE_TYPES)
    delete_file(current_user.avatar)
    current_user.avatar = new_avatar
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete('/me/avatar', response_model=UserRead)
def delete_avatar(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    delete_file(current_user.avatar)
    current_user.avatar = None
    db.commit()
    db.refresh(current_user)
    return current_user
