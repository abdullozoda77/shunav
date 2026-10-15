import os
import uuid
from typing import Literal

from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db, engine, Base
from models import User, Author, Category, Narrator, Book, Chapter, Bookmark, Favorite, Review, CopyrightReport
from schemas import *
from crud import *
from auth import verify_password, create_access_token, get_current_user, get_admin_user

Base.metadata.create_all(bind=engine)

MEDIA_DIR = 'media'
AUDIO_TYPES = {'audio/mpeg': '.mp3', 'audio/mp4': '.m4a', 'audio/aac': '.aac', 'audio/ogg': '.ogg', 'audio/wav': '.wav', 'audio/x-wav': '.wav'}
IMAGE_TYPES = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'}

app = FastAPI(
    title='Audiobooks API',
    description='Classic books (public domain) to read and to listen, chapter by chapter',
    openapi_tags=[
        {'name': 'Auth'},
        {'name': 'Authors'},
        {'name': 'Categories'},
        {'name': 'Narrators'},
        {'name': 'Books'},
        {'name': 'Chapters'},
        {'name': 'Listening'},
        {'name': 'Bookmarks'},
        {'name': 'Favorites'},
        {'name': 'Reviews'},
        {'name': 'Copyright reports'},
    ]
)

os.makedirs(f'{MEDIA_DIR}/audio', exist_ok=True)
os.makedirs(f'{MEDIA_DIR}/covers', exist_ok=True)
# Starlette's StaticFiles answers Range requests, so the player can seek inside an mp3.
app.mount('/media', StaticFiles(directory=MEDIA_DIR), name='media')


def or_404(obj, name, pk):
    if obj is None:
        raise HTTPException(status_code=404, detail=f'{name} #{pk} not found')
    return obj

def published_book_or_404(db, book_id, user=None):
    book = or_404(get_one(db, Book, book_id), 'Book', book_id)
    if not book.is_published and not (user and user.is_admin):
        raise HTTPException(status_code=404, detail=f'Book #{book_id} not found')
    return book

def check_book_links(db, data):
    if data.author_id is not None:
        or_404(get_one(db, Author, data.author_id), 'Author', data.author_id)
    if data.category_id is not None:
        or_404(get_one(db, Category, data.category_id), 'Category', data.category_id)
    if data.narrator_id is not None:
        or_404(get_one(db, Narrator, data.narrator_id), 'Narrator', data.narrator_id)

def save_upload(file: UploadFile, folder: str, allowed: dict) -> str:
    ext = allowed.get(file.content_type)
    if ext is None:
        raise HTTPException(status_code=400, detail=f'File type {file.content_type} is not allowed')
    name = f'{uuid.uuid4().hex}{ext}'
    with open(f'{MEDIA_DIR}/{folder}/{name}', 'wb') as out:
        while chunk := file.file.read(1024 * 1024):
            out.write(chunk)
    return f'/{MEDIA_DIR}/{folder}/{name}'

def remove_file(url: str | None):
    if url and os.path.isfile(url.lstrip('/')):
        os.remove(url.lstrip('/'))


# Auth
@app.post('/register', tags=['Auth'], response_model=UserRead)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_username(db, data.username.strip().lower()):
        raise HTTPException(status_code=400, detail='Username already exists')
    if get_user_by_email(db, data.email.lower()):
        raise HTTPException(status_code=400, detail='Email already exists')
    return create_user(db, data)

@app.post('/login', tags=['Auth'], response_model=TokenSchema)
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = get_user_by_username(db, data.username.strip().lower())
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Invalid username or password')
    return {'access_token': create_access_token(data={'user_id': user.id}), 'token_type': 'bearer'}

@app.get('/me', tags=['Auth'], response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@app.patch('/me', tags=['Auth'], response_model=UserRead)
def update_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return update_obj(db, current_user, data)


# Authors, categories, narrators: everyone reads, admin changes
def simple_crud(model, name, tag, create_schema, read_schema, path):
    @app.get(f'/{path}', tags=[tag], response_model=list[read_schema], name=f'list_{path}')
    def list_items(db: Session = Depends(get_db)):
        return get_all(db, model)

    @app.get(f'/{path}/{{pk}}', tags=[tag], response_model=read_schema, name=f'get_{path}')
    def get_item(pk: int, db: Session = Depends(get_db)):
        return or_404(get_one(db, model, pk), name, pk)

    @app.post(f'/{path}', tags=[tag], response_model=read_schema, status_code=201, name=f'create_{path}')
    def create_item(data: create_schema, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
        try:
            return create_obj(db, model, data)
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail=f'{name} already exists')

    @app.put(f'/{path}/{{pk}}', tags=[tag], response_model=read_schema, name=f'update_{path}')
    def update_item(pk: int, data: create_schema, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
        try:
            return update_obj(db, or_404(get_one(db, model, pk), name, pk), data)
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail=f'{name} already exists')

    @app.delete(f'/{path}/{{pk}}', tags=[tag], status_code=204, name=f'delete_{path}')
    def delete_item(pk: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
        obj = or_404(get_one(db, model, pk), name, pk)
        if obj.books:
            raise HTTPException(status_code=400, detail=f'{name} still has books')
        delete_obj(db, obj)

simple_crud(Author, 'Author', 'Authors', AuthorCreate, AuthorRead, 'authors')
simple_crud(Category, 'Category', 'Categories', CategoryCreate, CategoryRead, 'categories')
simple_crud(Narrator, 'Narrator', 'Narrators', NarratorCreate, NarratorRead, 'narrators')


# Books
@app.get('/books', tags=['Books'], response_model=list[BookRead])
def list_books(
    search: str | None = None,
    author_id: int | None = None,
    category_id: int | None = None,
    language: Language | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return get_books(db, search, author_id, category_id, language, True, skip, limit)

@app.get('/books/{book_id}', tags=['Books'], response_model=BookDetail)
def get_book(book_id: int, db: Session = Depends(get_db)):
    return published_book_or_404(db, book_id)

@app.post('/books', tags=['Books'], response_model=BookDetail, status_code=201)
def create_book(data: BookCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    check_book_links(db, data)
    return create_obj(db, Book, data)

@app.patch('/books/{book_id}', tags=['Books'], response_model=BookDetail)
def update_book(book_id: int, data: BookUpdate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    book = or_404(get_one(db, Book, book_id), 'Book', book_id)
    check_book_links(db, data)
    return update_obj(db, book, data)

@app.delete('/books/{book_id}', tags=['Books'], status_code=204)
def delete_book(book_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    book = or_404(get_one(db, Book, book_id), 'Book', book_id)
    remove_file(book.cover)
    for chapter in book.chapters:
        remove_file(chapter.audio_file)
    delete_obj(db, book)

@app.post('/books/{book_id}/cover', tags=['Books'], response_model=BookDetail)
def upload_cover(book_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    book = or_404(get_one(db, Book, book_id), 'Book', book_id)
    url = save_upload(file, 'covers', IMAGE_TYPES)
    remove_file(book.cover)
    book.cover = url
    db.commit()
    db.refresh(book)
    return book


# Chapters
@app.get('/books/{book_id}/chapters', tags=['Chapters'], response_model=list[ChapterShort])
def list_chapters(book_id: int, db: Session = Depends(get_db)):
    return published_book_or_404(db, book_id).chapters

@app.post('/books/{book_id}/chapters', tags=['Chapters'], response_model=ChapterRead, status_code=201)
def add_chapter(book_id: int, data: ChapterCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    or_404(get_one(db, Book, book_id), 'Book', book_id)
    if get_chapter_by_order(db, book_id, data.order):
        raise HTTPException(status_code=400, detail=f'Chapter #{data.order} already exists in this book')
    return create_chapter(db, book_id, data)

@app.get('/chapters/{chapter_id}', tags=['Chapters'], response_model=ChapterRead)
def get_chapter(chapter_id: int, db: Session = Depends(get_db)):
    chapter = or_404(get_one(db, Chapter, chapter_id), 'Chapter', chapter_id)
    published_book_or_404(db, chapter.book_id)
    return chapter

@app.patch('/chapters/{chapter_id}', tags=['Chapters'], response_model=ChapterRead)
def update_chapter(chapter_id: int, data: ChapterUpdate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    chapter = or_404(get_one(db, Chapter, chapter_id), 'Chapter', chapter_id)
    if data.order is not None and data.order != chapter.order and get_chapter_by_order(db, chapter.book_id, data.order):
        raise HTTPException(status_code=400, detail=f'Chapter #{data.order} already exists in this book')
    return update_obj(db, chapter, data)

@app.delete('/chapters/{chapter_id}', tags=['Chapters'], status_code=204)
def delete_chapter(chapter_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    chapter = or_404(get_one(db, Chapter, chapter_id), 'Chapter', chapter_id)
    remove_file(chapter.audio_file)
    delete_obj(db, chapter)

@app.post('/chapters/{chapter_id}/audio', tags=['Chapters'], response_model=ChapterRead)
def upload_audio(
    chapter_id: int,
    file: UploadFile = File(...),
    duration_seconds: int = Form(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Upload a ready audio file (recorded by a person, or made earlier with TTS)."""
    chapter = or_404(get_one(db, Chapter, chapter_id), 'Chapter', chapter_id)
    url = save_upload(file, 'audio', AUDIO_TYPES)
    remove_file(chapter.audio_file)
    chapter.audio_file = url
    chapter.duration_seconds = duration_seconds
    chapter.audio_status = 'done'
    db.commit()
    db.refresh(chapter)
    return chapter


# Listening progress
@app.post('/progress', tags=['Listening'], response_model=ProgressRead)
def save_my_progress(data: ProgressSave, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """The player calls this every 10-15 seconds."""
    chapter = or_404(get_one(db, Chapter, data.chapter_id), 'Chapter', data.chapter_id)
    published_book_or_404(db, chapter.book_id)
    position = min(data.position_seconds, chapter.duration_seconds) if chapter.duration_seconds else data.position_seconds
    return save_progress(db, current_user.id, chapter.id, position)

@app.get('/books/{book_id}/progress', tags=['Listening'], response_model=list[ProgressRead])
def my_book_progress(book_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    published_book_or_404(db, book_id)
    return get_book_progress(db, current_user.id, book_id)

@app.get('/me/continue', tags=['Listening'], response_model=list[ContinueItem])
def continue_listening(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_continue_list(db, current_user.id)


# Bookmarks
@app.get('/me/bookmarks', tags=['Bookmarks'], response_model=list[BookmarkRead])
def my_bookmarks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_user_bookmarks(db, current_user.id)

@app.post('/me/bookmarks', tags=['Bookmarks'], response_model=BookmarkRead, status_code=201)
def add_bookmark(data: BookmarkCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    chapter = or_404(get_one(db, Chapter, data.chapter_id), 'Chapter', data.chapter_id)
    published_book_or_404(db, chapter.book_id)
    bookmark = Bookmark(user_id=current_user.id, **data.model_dump())
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return bookmark

@app.delete('/me/bookmarks/{bookmark_id}', tags=['Bookmarks'], status_code=204)
def delete_bookmark(bookmark_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bookmark = get_one(db, Bookmark, bookmark_id)
    if bookmark is None or bookmark.user_id != current_user.id:
        raise HTTPException(status_code=404, detail=f'Bookmark #{bookmark_id} not found')
    delete_obj(db, bookmark)


# Favorites
@app.get('/me/favorites', tags=['Favorites'], response_model=list[FavoriteRead])
def my_favorites(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_user_favorites(db, current_user.id)

@app.post('/books/{book_id}/favorite', tags=['Favorites'], response_model=FavoriteRead, status_code=201)
def add_favorite(book_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    published_book_or_404(db, book_id)
    if get_favorite(db, current_user.id, book_id):
        raise HTTPException(status_code=400, detail='Book is already in favorites')
    favorite = Favorite(user_id=current_user.id, book_id=book_id)
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite

@app.delete('/books/{book_id}/favorite', tags=['Favorites'], status_code=204)
def remove_favorite(book_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    favorite = get_favorite(db, current_user.id, book_id)
    if favorite is None:
        raise HTTPException(status_code=404, detail='Book is not in favorites')
    delete_obj(db, favorite)


# Reviews
@app.get('/books/{book_id}/reviews', tags=['Reviews'], response_model=list[ReviewRead])
def book_reviews(book_id: int, db: Session = Depends(get_db)):
    published_book_or_404(db, book_id)
    return get_book_reviews(db, book_id)

@app.get('/books/{book_id}/rating', tags=['Reviews'])
def book_rating(book_id: int, db: Session = Depends(get_db)):
    published_book_or_404(db, book_id)
    return get_book_rating(db, book_id)

@app.post('/books/{book_id}/reviews', tags=['Reviews'], response_model=ReviewRead, status_code=201)
def add_review(book_id: int, data: ReviewCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    published_book_or_404(db, book_id)
    if get_review(db, current_user.id, book_id):
        raise HTTPException(status_code=400, detail='You already reviewed this book')
    review = Review(user_id=current_user.id, book_id=book_id, **data.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review

@app.delete('/reviews/{review_id}', tags=['Reviews'], status_code=204)
def delete_review(review_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    review = or_404(get_one(db, Review, review_id), 'Review', review_id)
    if review.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail='You can delete only your own review')
    delete_obj(db, review)


# Copyright reports
@app.post('/books/{book_id}/report', tags=['Copyright reports'], response_model=ReportRead, status_code=201)
def report_book(book_id: int, data: ReportCreate, db: Session = Depends(get_db)):
    """Anyone (even without an account) can say a book breaks someone's copyright."""
    or_404(get_one(db, Book, book_id), 'Book', book_id)
    report = CopyrightReport(book_id=book_id, **data.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

@app.get('/reports', tags=['Copyright reports'], response_model=list[ReportRead])
def list_reports(
    status: Literal['new', 'reviewed', 'removed'] | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    return get_reports(db, status)

@app.patch('/reports/{report_id}', tags=['Copyright reports'], response_model=ReportRead)
def set_report_status(report_id: int, data: ReportStatus, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    report = or_404(get_one(db, CopyrightReport, report_id), 'Report', report_id)
    report.status = data.status
    if data.status == 'removed':
        report_book_obj = get_one(db, Book, report.book_id)
        report_book_obj.is_published = False  # hide the book at once
    db.commit()
    db.refresh(report)
    return report
