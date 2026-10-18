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

## Расми муаллифон (portraits.py)

Портретҳои 3D бо Figma AI сохта шудаанд (тасвири бадеӣ — акси шоирони асрҳои миёна вуҷуд надорад).
Файлҳо дар `portraits/`; скрипт онҳоро ба муаллифон мепайвандад:

```bash
.venv/bin/python portraits.py
```

## Овоз

**Овози содда (дар ҳамин компютер):** `generate_audio.py` — модели `facebook/mms-tts-tgk`, бе GPU кор мекунад,
вале овозаш мошинӣ аст.

**Овози табиӣ (дар Google Colab):** модели Chatterbox Tajik (`Tohirju/chatterbox-mtl-tajik`) овози як
шахсро аз сабти 10–20 сония меомӯзад ва бо он мехонад. Ба GPU ниёз дорад, барои ҳамин дар Colab-и ройгон кор мекунад:

1. `.venv\Scripts\python export_for_tts.py` → `data/tts/chapters.json`
2. Дар Google Drive папкаи `shunav_tts`: `chapters.json` ва `voice.wav` (овози шахсе, ки розӣ аст).
3. `tts_colab.ipynb`-ро дар Colab кушоед (GPU T4) ва ҳамаашро иҷро кунед. Бобҳои тайёр дар `shunav_tts/audio/` нигоҳ
   дошта мешаванд; агар Colab қатъ шавад, аз нав иҷро кунед — бобҳои тайёр гузаронида мешаванд.
4. Папкаи `audio`-ро зеркашӣ кунед: `.venv\Scripts\python import_audio.py <папка>`

Ҳеҷ модели AI бехато намехонад (ин модел тақрибан 1 калима аз 10-ро нодуруст мехонад), ва матни кириллӣ
худкор гардонида шудааст — барои хониши бехато ровии зинда ва матни санҷидашуда лозим аст.

## Оғоз дар Windows (PowerShell)

Лозим: **Python 3.12+**, **Node.js 20+**, **Git**.

```powershell
git clone https://github.com/abdullozoda77/shunav.git
cd shunav
$env:PYTHONUTF8 = "1"                 # ҳарфҳои тоҷикӣ дар терминал дуруст

python -m venv .venv
.venv\Scripts\pip install -r requirements.txt -r requirements-import.txt

.venv\Scripts\python seed.py          # корбарон: admin/admin123, demo/demo123 + китобҳои намунавӣ
.venv\Scripts\python import_books.py Рубоиёт Ашъор "Шоҳнома (достонҳои интихобӣ)"   # тайёр, якчанд сония
.venv\Scripts\python covers.py        # муқоваҳо
.venv\Scripts\python portraits.py     # портретҳои муаллифон

cd frontend
npm install
npm run dev                           # http://localhost:5175
```

Китобҳои боқимонда (Гулистон, Маснавӣ, Бӯстон, Девони Ҳофиз) ҳанӯз ба кириллӣ гардонида нашудаанд —
барои онҳо модели гардониш (бори аввал ~400 MB) зеркашӣ мешавад ва кор чанд соат давом мекунад:

```powershell
.venv\Scripts\python import_books.py Гулистон "Маснавии маънавӣ. Дафтари аввал" Бӯстон "Девони ғазалиёт"
```

Матнҳои аз Ганҷур гирифташуда (`data/ganjoor/`) ва натиҷаи гардониш (`data/tajik_cache.json`) дар репозиторий
ҳастанд, бинобар ин ҳеҷ чиз аз нав зеркашӣ ё гардонида намешавад.
