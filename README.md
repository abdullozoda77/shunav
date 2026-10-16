# Audiobooks API (FastAPI)

Китобҳои классикӣ (public domain) барои хондан ва гӯш кардан, боб ба боб.

## Оғоз

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python create_admin.py admin admin@example.tj <password>
.venv/bin/uvicorn main:app --reload
```

Swagger: http://127.0.0.1:8000/docs

## Сохтор

```
main.py         ← app, CORS, /media, ҳамаи routers
config.py       ← SECRET_KEY, CORS, намудҳои файл
database.py     ← SQLite, get_db
models.py       ← ҳамаи ҷадвалҳо
schemas.py      ← Pydantic (дархост / ҷавоб)
auth.py         ← парол, JWT, get_current_user, get_admin_user
utils.py        ← get_or_404, get_visible_book, save_file, delete_file
routers/
  users.py      ← /register /login /me
  authors.py  categories.py  narrators.py
  books.py      ← рӯйхат, ҷустуҷӯ, муқова
  chapters.py   ← бобҳо, аудио, иваз кардани тартиб
  listening.py  ← /progress /me/continue /me/stats
  bookmarks.py  favorites.py  reviews.py
  reports.py    ← шикоят аз ҳуқуқ
  admin.py      ← ҳамаи китобҳо, корбарон, омор
```

## Моделҳо

- **User**: корбар, забони интихобшуда, `is_admin`
- **Author** (`death_year` барои санҷиши public domain), **Category**, **Narrator** (AI ё инсон)
- **Book**: `language`, `license_type`, `source_url`, `is_published`, муқова
- **Chapter**: ҳар боб матн ва файли аудиои худро дорад (`audio_status`)
- **ListeningProgress**: корбар аз ҳамон ҷое давом медиҳад, ки қатъ карда буд
- **Bookmark**, **Favorite**, **Review**
- **CopyrightReport**: шикоят аз ҳуқуқ; ҳолати `removed` китобро фавран пинҳон мекунад

Аудио дар `media/audio/` нигоҳ дошта мешавад ва аз `/media/...` бо Range (перемотка) дода мешавад.
