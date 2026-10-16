import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import CORS_ORIGINS, MEDIA_DIR
from database import Base, engine
from routers import admin, authors, bookmarks, books, categories, chapters, favorites, listening, narrators, reports, reviews, users

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title='Audiobooks API',
    description='Classic books (public domain) to read and to listen, chapter by chapter',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Covers and audio files. StaticFiles answers Range requests, so the player can jump inside an mp3.
os.makedirs(MEDIA_DIR, exist_ok=True)
app.mount('/media', StaticFiles(directory=MEDIA_DIR), name='media')

app.include_router(users.router)
app.include_router(authors.router)
app.include_router(categories.router)
app.include_router(narrators.router)
app.include_router(books.router)
app.include_router(chapters.router)
app.include_router(listening.router)
app.include_router(bookmarks.router)
app.include_router(favorites.router)
app.include_router(reviews.router)
app.include_router(reports.router)
app.include_router(admin.router)


@app.get('/', tags=['Home'])
def home():
    return {'message': 'Audiobooks API', 'docs': '/docs'}
