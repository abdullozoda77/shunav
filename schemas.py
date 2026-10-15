from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Language = Literal['tg', 'ru', 'en']
LicenseType = Literal['public_domain', 'licensed', 'creative_commons']


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# Auth / users
class UserCreate(BaseModel):
    name: str = Field(min_length=1)
    username: str = Field(min_length=3)
    email: EmailStr
    password: str = Field(min_length=6)
    preferred_language: Language = 'tg'


class UserUpdate(BaseModel):
    name: str | None = None
    preferred_language: Language | None = None


class UserRead(ORMModel):
    id: int
    name: str
    username: str
    email: str
    preferred_language: str
    is_admin: bool
    created_at: datetime


class LoginSchema(BaseModel):
    username: str
    password: str


class TokenSchema(BaseModel):
    access_token: str
    token_type: str


# Authors, categories, narrators
class AuthorCreate(BaseModel):
    name: str = Field(min_length=1)
    bio: str | None = None
    birth_year: int | None = None
    death_year: int | None = None


class AuthorRead(ORMModel, AuthorCreate):
    id: int


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str | None = None


class CategoryRead(ORMModel, CategoryCreate):
    id: int


class NarratorCreate(BaseModel):
    name: str = Field(min_length=1)
    kind: Literal['ai', 'human'] = 'ai'
    tts_model: str | None = None


class NarratorRead(ORMModel, NarratorCreate):
    id: int


# Books and chapters
class BookCreate(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    language: Language = 'tg'
    license_type: LicenseType = 'public_domain'
    source_url: str | None = None
    is_published: bool = True
    author_id: int
    category_id: int | None = None
    narrator_id: int | None = None


class BookUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    language: Language | None = None
    license_type: LicenseType | None = None
    source_url: str | None = None
    is_published: bool | None = None
    author_id: int | None = None
    category_id: int | None = None
    narrator_id: int | None = None


class BookRead(ORMModel):
    id: int
    title: str
    description: str | None
    cover: str | None
    language: str
    license_type: str
    is_published: bool
    total_duration: int
    author: AuthorRead
    category: CategoryRead | None
    narrator: NarratorRead | None


class ChapterCreate(BaseModel):
    order: int = Field(ge=1)
    title: str = Field(min_length=1)
    text: str | None = None


class ChapterUpdate(BaseModel):
    order: int | None = Field(default=None, ge=1)
    title: str | None = None
    text: str | None = None
    duration_seconds: int | None = Field(default=None, ge=0)


class ChapterShort(ORMModel):
    id: int
    order: int
    title: str
    audio_file: str | None
    duration_seconds: int
    audio_status: str


class ChapterRead(ChapterShort):
    book_id: int
    text: str | None


class BookDetail(BookRead):
    source_url: str | None
    chapters: list[ChapterShort]


# Listening
class ProgressSave(BaseModel):
    chapter_id: int
    position_seconds: int = Field(ge=0)


class ProgressRead(ORMModel):
    chapter_id: int
    position_seconds: int
    updated_at: datetime | None


class ContinueItem(BaseModel):
    book: BookRead
    chapter: ChapterShort
    position_seconds: int


class BookmarkCreate(BaseModel):
    chapter_id: int
    position_seconds: int = Field(ge=0)
    note: str | None = None


class BookmarkRead(ORMModel):
    id: int
    chapter_id: int
    position_seconds: int
    note: str | None
    created_at: datetime


class FavoriteRead(ORMModel):
    id: int
    book: BookRead
    created_at: datetime


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str | None = None


class ReviewRead(ORMModel):
    id: int
    user_id: int
    book_id: int
    rating: int
    text: str | None
    created_at: datetime


class ReportCreate(BaseModel):
    email: EmailStr
    message: str = Field(min_length=5)


class ReportRead(ORMModel):
    id: int
    book_id: int
    email: str
    message: str
    status: str
    created_at: datetime


class ReportStatus(BaseModel):
    status: Literal['new', 'reviewed', 'removed']
