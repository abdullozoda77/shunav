from sqlalchemy import func
from sqlalchemy.orm import Session
from models import User, Author, Category, Narrator, Book, Chapter, ListeningProgress, Bookmark, Favorite, Review, CopyrightReport
from auth import hash_password

def get_user(db: Session, pk: int):
    return db.query(User).filter(User.id == pk).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, data):
    user = User(
        name=data.name,
        username=data.username.strip().lower(),
        email=data.email.lower(),
        preferred_language=data.preferred_language,
        password_hash=hash_password(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_all(db: Session, model):
    return db.query(model).order_by(model.id).all()

def get_one(db: Session, model, pk: int):
    return db.query(model).filter(model.id == pk).first()

def create_obj(db: Session, model, data):
    obj = model(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def update_obj(db: Session, obj, data):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj

def delete_obj(db: Session, obj):
    db.delete(obj)
    db.commit()

def get_books(db: Session, search=None, author_id=None, category_id=None, language=None, only_published=True, skip=0, limit=20):
    query = db.query(Book)
    if only_published:
        query = query.filter(Book.is_published.is_(True))
    if search:
        query = query.join(Author).filter(
            Book.title.ilike(f'%{search}%') | Author.name.ilike(f'%{search}%')
        )
    if author_id:
        query = query.filter(Book.author_id == author_id)
    if category_id:
        query = query.filter(Book.category_id == category_id)
    if language:
        query = query.filter(Book.language == language)
    return query.order_by(Book.id.desc()).offset(skip).limit(limit).all()

def get_chapter_by_order(db: Session, book_id: int, order: int):
    return db.query(Chapter).filter(Chapter.book_id == book_id, Chapter.order == order).first()

def create_chapter(db: Session, book_id: int, data):
    chapter = Chapter(book_id=book_id, **data.model_dump())
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter

def save_progress(db: Session, user_id: int, chapter_id: int, position_seconds: int):
    progress = db.query(ListeningProgress).filter(
        ListeningProgress.user_id == user_id, ListeningProgress.chapter_id == chapter_id
    ).first()
    if progress is None:
        progress = ListeningProgress(user_id=user_id, chapter_id=chapter_id)
        db.add(progress)
    progress.position_seconds = position_seconds
    db.commit()
    db.refresh(progress)
    return progress

def get_book_progress(db: Session, user_id: int, book_id: int):
    return db.query(ListeningProgress).join(Chapter).filter(
        ListeningProgress.user_id == user_id, Chapter.book_id == book_id
    ).order_by(Chapter.order).all()

def get_continue_list(db: Session, user_id: int, limit=10):
    rows = db.query(ListeningProgress).filter(ListeningProgress.user_id == user_id).order_by(
        ListeningProgress.updated_at.desc(), ListeningProgress.id.desc()
    ).all()
    result, seen = [], set()
    for row in rows:
        book = row.chapter.book
        if book.id in seen or not book.is_published:
            continue
        seen.add(book.id)
        result.append({'book': book, 'chapter': row.chapter, 'position_seconds': row.position_seconds})
        if len(result) == limit:
            break
    return result

def get_user_bookmarks(db: Session, user_id: int):
    return db.query(Bookmark).filter(Bookmark.user_id == user_id).order_by(Bookmark.id.desc()).all()

def get_favorite(db: Session, user_id: int, book_id: int):
    return db.query(Favorite).filter(Favorite.user_id == user_id, Favorite.book_id == book_id).first()

def get_user_favorites(db: Session, user_id: int):
    return db.query(Favorite).filter(Favorite.user_id == user_id).order_by(Favorite.id.desc()).all()

def get_review(db: Session, user_id: int, book_id: int):
    return db.query(Review).filter(Review.user_id == user_id, Review.book_id == book_id).first()

def get_book_reviews(db: Session, book_id: int):
    return db.query(Review).filter(Review.book_id == book_id).order_by(Review.id.desc()).all()

def get_book_rating(db: Session, book_id: int):
    avg, count = db.query(func.avg(Review.rating), func.count(Review.id)).filter(Review.book_id == book_id).one()
    return {'average': round(avg, 2) if avg else 0, 'count': count}

def get_reports(db: Session, status=None):
    query = db.query(CopyrightReport)
    if status:
        query = query.filter(CopyrightReport.status == status)
    return query.order_by(CopyrightReport.id.desc()).all()