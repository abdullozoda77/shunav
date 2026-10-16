from datetime import datetime
from typing import Literal

import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

Language = Literal['tg', 'ru', 'en']
LicenseType = Literal['public_domain', 'licensed', 'creative_commons']


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str
    preferred_language: Language = 'tg'

    @field_validator('name')
    @classmethod
    def validate_name(cls, value):
        if len(value.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        return value.strip()

    @field_validator('username')
    @classmethod
    def validate_username(cls, value):
        value = value.strip().lower()
        if len(value) < 3:
            raise ValueError('Username must be at least 3 characters')
        if not re.fullmatch(r'[a-z0-9_]+', value):
            raise ValueError('Username may have only latin letters, digits and _')
        return value

    @field_validator('password')
    @classmethod
    def validate_password(cls, value):
        if len(value) < 6:
            raise ValueError('Password must be at least 6 characters')
        if value.isdigit():
            raise ValueError('Password must not be only digits')
        return value


class UserUpdate(BaseModel):
    name: str | None = None
    preferred_language: Language | None = None


class UserRead(ORMModel):
    id: int
    name: str
    username: str
    email: str
    preferred_language: str
    is_active: bool
    is_admin: bool
    created_at: datetime


class LoginSchema(BaseModel):
    username: str
    password: str


class TokenSchema(BaseModel):
    access_token: str
    token_type: str


class AuthorCreate(BaseModel):
    name: str
    bio: str | None = None
    birth_year: int | None = None
    death_year: int | None = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, value):
        if len(value.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        return value.strip()

    @field_validator('birth_year', 'death_year')
    @classmethod
    def validate_year(cls, value):
        if value is not None and (value < 0 or value > datetime.now().year):
            raise ValueError(f'Year must be between 0 and {datetime.now().year}')
        return value

    @model_validator(mode='after')
    def validate_years(self):
        if self.birth_year and self.death_year and self.death_year < self.birth_year:
            raise ValueError('Death year must be after birth year')
        return self


class AuthorRead(ORMModel, AuthorCreate):
    id: int


class CategoryCreate(BaseModel):
    name: str
    description: str | None = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, value):
        if len(value.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        return value.strip()


class CategoryRead(ORMModel, CategoryCreate):
    id: int


class NarratorCreate(BaseModel):
    name: str = Field(min_length=1)
    kind: Literal['ai', 'human'] = 'ai'
    tts_model: str | None = None


class NarratorRead(ORMModel, NarratorCreate):
    id: int


class BookCreate(BaseModel):
    title: str
    description: str | None = None
    language: Language = 'tg'
    license_type: LicenseType = 'public_domain'
    source_url: str | None = None
    is_published: bool = True
    author_id: int
    category_id: int | None = None
    narrator_id: int | None = None

    @field_validator('title')
    @classmethod
    def validate_title(cls, value):
        if len(value.strip()) < 2:
            raise ValueError('Title must be at least 2 characters')
        return value.strip()

    @field_validator('source_url')
    @classmethod
    def validate_source_url(cls, value):
        if value and not value.startswith(('http://', 'https://')):
            raise ValueError('Source URL must start with http:// or https://')
        return value


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
    average_rating: float
    reviews_count: int
    author: AuthorRead
    category: CategoryRead | None
    narrator: NarratorRead | None


class ChapterCreate(BaseModel):
    order: int
    title: str
    text: str | None = None

    @field_validator('order')
    @classmethod
    def validate_order(cls, value):
        if value < 1:
            raise ValueError('Chapter number must be 1 or more')
        return value

    @field_validator('title')
    @classmethod
    def validate_title(cls, value):
        if not value.strip():
            raise ValueError('Title must not be empty')
        return value.strip()


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


class BookmarkChapter(ORMModel):
    id: int
    title: str
    book_id: int
    book_title: str


class BookmarkRead(ORMModel):
    id: int
    chapter_id: int
    chapter: BookmarkChapter
    position_seconds: int
    note: str | None
    created_at: datetime


class FavoriteRead(ORMModel):
    id: int
    book: BookRead
    created_at: datetime


class ReviewCreate(BaseModel):
    rating: int
    text: str | None = None

    @field_validator('rating')
    @classmethod
    def validate_rating(cls, value):
        if value < 1 or value > 5:
            raise ValueError('Rating must be from 1 to 5')
        return value

    @field_validator('text')
    @classmethod
    def validate_text(cls, value):
        if value is not None and len(value) > 2000:
            raise ValueError('Review must be at most 2000 characters')
        return value.strip() or None if value else None


class ReviewUser(ORMModel):
    id: int
    name: str


class ReviewRead(ORMModel):
    id: int
    user_id: int
    user: ReviewUser
    book_id: int
    rating: int
    text: str | None
    created_at: datetime


class ReportCreate(BaseModel):
    email: EmailStr
    message: str

    @field_validator('message')
    @classmethod
    def validate_message(cls, value):
        if len(value.strip()) < 10:
            raise ValueError('Message must be at least 10 characters')
        return value.strip()


class ReportRead(ORMModel):
    id: int
    book_id: int
    email: str
    message: str
    status: str
    created_at: datetime


class ReportStatus(BaseModel):
    status: Literal['new', 'reviewed', 'removed']


class RatingRead(BaseModel):
    average: float
    count: int


class ChapterOrder(BaseModel):
    chapter_ids: list[int]


class StatsRead(BaseModel):
    listened_seconds: int
    books_started: int
    books_finished: int
    bookmarks: int
    favorites: int
    reviews: int
