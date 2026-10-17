# Audiobooks API (FastAPI)

Китобҳои классикӣ (public domain) барои хондан ва гӯш кардан, боб ба боб.

## Оғоз

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python seed.py            # китобҳои намунавӣ, admin/admin123 ва demo/demo123
cd frontend && npm install
npm run dev                         # FastAPI (8002) + React (5175) якҷоя
```

- Сайт: http://localhost:5175
- Swagger: http://127.0.0.1:8002/docs

## Frontend (frontend/src)

```
api.js        ← ҳамаи дархостҳо ба API (/api → FastAPI)
auth.jsx      ← кӣ ворид шудааст (useAuth)
player.jsx    ← як <audio> барои тамоми сайт (usePlayer): пахш, суръат, вақтсанҷи хоб, сабти пешрафт
hooks.js      ← useApi("/books") — бор кардани маълумот
pages/        ← Welcome, Login/Register, Home, Search, Book, Player, Reader, Library, Profile
components/   ← Header, BottomNav, MiniPlayer, Cover, Stars, Modal ...
```

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

## Китобҳои воқеӣ (import_books.py)

Матни пурраи 7 китоб аз Ганҷур (ganjoor.net) гирифта шуда, бо модели `shekar` ба кириллӣ гардонида мешавад:
Рубоиёти Хайём, Ашъори Рӯдакӣ, Шоҳнома (достонҳои интихобӣ), Гулистон, Маснавӣ (дафтари 1), Бӯстон, Девони Ҳофиз.

```bash
.venv/bin/pip install -r requirements-import.txt   # як бор
.venv/bin/python import_books.py                   # ҳамаи китобҳо (дар ноутбук чанд соат)
.venv/bin/python import_books.py Гулистон          # танҳо як китоб
```

Ҳар китоб пас аз тайёр шудан фавран дар сайт пайдо мешавад. Матнҳо ва натиҷаҳо дар `data/` нигоҳ дошта мешаванд,
бинобар ин такрор кардан тез аст. Гардониши худкор хатоҳо дорад — пеш аз нашри воқеӣ муҳаррир бояд санҷад.

## Муқоваҳо (covers.py)

Муқоваи ҳар китоб — миниатюраи аслии форсӣ аз Осорхонаи Метрополитен (Open Access, public domain):

```bash
.venv/bin/python covers.py
```
