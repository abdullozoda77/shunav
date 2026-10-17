"""Import full classic books from Ganjoor (ganjoor.net) and convert them to Tajik Cyrillic.

    .venv/bin/pip install -r requirements-import.txt   (once: the converter model)
    .venv/bin/python import_books.py

Steps:
1. Download   — every poem of each book from the Ganjoor API, saved in data/ganjoor/ (downloaded only once).
2. Convert    — Persian script -> Tajik Cyrillic with the ByT5 model from the `shekar` library.
                Results are saved in data/tajik_cache.json, so a second run is fast.
3. Save       — each book with its chapters goes into the database (an old book with the same title is replaced).

All these works are hundreds of years old (public domain). The conversion is automatic, so it has spelling
mistakes; every book says so in its description, and an editor should check the text before publishing for real.
"""
import hashlib
import json
import os
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from database import Base, SessionLocal, engine
from models import Author, Book, Category, Chapter

API = 'https://api.ganjoor.net/api/ganjoor'
DATA_DIR = 'data/ganjoor'
CACHE_FILE = 'data/tajik_cache.json'

NOTE = ('\n\nМатн аз сайти Ганҷур (ganjoor.net) гирифта шуда, бо барномаи худкор аз хати форсӣ ба кириллӣ '
        'гардонида шудааст. Дар он хатоҳои имлоӣ буда метавонанд.')

AUTHORS = {
    'saadi': dict(name='Саъдии Шерозӣ', birth_year=1210, death_year=1291,
                  bio='Шоир ва нависандаи бузурги форсу тоҷик, муаллифи «Гулистон» ва «Бӯстон».'),
    'khayyam': dict(name='Умари Хайём', birth_year=1048, death_year=1131,
                    bio='Шоир, риёзидон ва ситорашиноси машҳур, устоди рубоӣ.'),
    'hafez': dict(name='Ҳофизи Шерозӣ', birth_year=1325, death_year=1390, bio='Устоди бузурги ғазал.'),
    'rudaki': dict(name='Абӯабдуллоҳи Рӯдакӣ', birth_year=858, death_year=941,
                   bio='Одамушшуаро — падари шеъри форсу тоҷик.'),
    'rumi': dict(name='Ҷалолиддини Балхӣ (Румӣ)', birth_year=1207, death_year=1273,
                 bio='Шоир ва орифи бузург, муаллифи «Маснавии маънавӣ» ва «Девони Шамс».'),
    'ferdowsi': dict(name='Абулқосим Фирдавсӣ', birth_year=940, death_year=1020,
                     bio='Муаллифи «Шоҳнома», бузургтарин достони қаҳрамонии форсу тоҷик.'),
}

# Each book: chapters are Ganjoor categories ("cat") or a category cut into groups ("group").
BOOKS = [
    dict(
        title='Гулистон', author='saadi', category='Наср', url='https://ganjoor.net/saadi/golestan',
        description='«Гулистон» — шоҳкори насри мусаҷҷаъ ва пандомӯзи Саъдии Шерозӣ (соли 1258): дебоча ва ҳашт боб '
                    'дар бораи ахлоқ, қаноат, хомӯшӣ, ишқ, тарбия ва одоби суҳбат.',
        item='Ҳикояти',
        chapters=[
            ('Дебоча', 'poems_of', 1665),
            ('Боби аввал: Дар сирати подшоҳон', 'cat', 1666),
            ('Боби дуюм: Дар ахлоқи дарвешон', 'cat', 1667),
            ('Боби сеюм: Дар фазилати қаноат', 'cat', 1668),
            ('Боби чаҳорум: Дар фавоиди хомӯшӣ', 'cat', 1669),
            ('Боби панҷум: Дар ишқу ҷавонӣ', 'cat', 1670),
            ('Боби шашум: Дар заъфу пирӣ', 'cat', 1671),
            ('Боби ҳафтум: Дар таъсири тарбият', 'cat', 1672),
            ('Боби ҳаштум: Дар одоби суҳбат', 'cat', 1673),
        ],
    ),
    dict(
        title='Бӯстон', author='saadi', category='Достон', url='https://ganjoor.net/saadi/boostan',
        description='«Бӯстон» (соли 1257) — маснавии пандуахлоқии Саъдӣ дар даҳ боб: адл, эҳсон, ишқ, тавозӯъ, ризо, '
                    'қаноат, тарбият, шукр, тавба ва муноҷот.',
        chapters=[
            ('Дар ниёиши Худованд', 'cat', 124),
            ('Боби аввал: Дар адлу тадбиру рой', 'cat', 125),
            ('Боби дуюм: Дар эҳсон', 'cat', 126),
            ('Боби сеюм: Дар ишқу мастиву шӯр', 'cat', 127),
            ('Боби чаҳорум: Дар тавозӯъ', 'cat', 128),
            ('Боби панҷум: Дар ризо', 'cat', 129),
            ('Боби шашум: Дар қаноат', 'cat', 130),
            ('Боби ҳафтум: Дар олами тарбият', 'cat', 131),
            ('Боби ҳаштум: Дар шукр бар офият', 'cat', 132),
            ('Боби нӯҳум: Дар тавба ва роҳи савоб', 'cat', 133),
            ('Боби даҳум: Дар муноҷот ва хатми китоб', 'cat', 134),
        ],
    ),
    dict(
        title='Рубоиёт', author='khayyam', category='Рубоӣ', url='https://ganjoor.net/khayyam/robaee',
        description='Рубоиёти Умари Хайём — андешаҳои фалсафӣ дар бораи ҳаёт, марг, ишқ ва фурсати гаронбаҳои умр.',
        item='Рубоии', group=('Рубоиҳои', 31, 25),
    ),
    dict(
        title='Девони ғазалиёт', author='hafez', category='Ғазал', url='https://ganjoor.net/hafez/ghazal',
        description='Ғазалиёти Ҳофизи Шерозӣ — қуллаи ғазали ошиқона ва ирфонии форсу тоҷик.',
        item='Ғазали', group=('Ғазалҳои', 24, 25),
    ),
    dict(
        title='Ашъор', author='rudaki', category='Шеър', url='https://ganjoor.net/roodaki',
        description='Ҳамаи ашъори то мо расидаи Рӯдакӣ: қасидаҳо ва қитъаҳо, рубоиҳо, порчаҳо аз маснавиҳо '
                    '(аз ҷумла «Калила ва Димна») ва абёти пароканда.',
        chapters=[
            ('Қасидаҳо ва қитъаҳо', 'cat', 210),
            ('Рубоиёт', 'cat', 211),
            ('Маснавиҳо', 'cat', 368),
            ('Абёти пароканда', 'cat', 365),
        ],
    ),
    dict(
        title='Маснавии маънавӣ. Дафтари аввал', author='rumi', category='Достон', url='https://ganjoor.net/moulavi/masnavi/daftar1',
        description='Дафтари аввали «Маснавии маънавӣ»-и Мавлоно Ҷалолиддини Балхӣ — аз «Бишнав аз най чун ҳикоят мекунад» '
                    'то охир, бо ҳикоятҳо ва ҳикматҳои ирфонӣ.',
        group=('Қисмҳои', 104, 15),
    ),
    dict(
        title='Шоҳнома (достонҳои интихобӣ)', author='ferdowsi', category='Достон', url='https://ganjoor.net/ferdousi/shahname',
        description='Оғози «Шоҳнома» ва достонҳои подшоҳони пешдодӣ то Заҳҳок, инчунин достони машҳури «Рустам ва Сӯҳроб».',
        chapters=[
            ('Оғози китоб', 'cat', 34),
            ('Каюмарс', 'cat', 35),
            ('Ҳушанг', 'cat', 36),
            ('Таҳмурас', 'cat', 37),
            ('Ҷамшед', 'cat', 38),
            ('Заҳҳок', 'cat', 39),
            ('Достони Рустам ва Сӯҳроб', 'cat', 48),
        ],
    ),
]

# The short demo books from seed.py that each real book replaces (removed when the real one is saved)
REPLACES = {
    'Гулистон': ['Гулистон'],
    'Рубоиёт': ['Рубоиёт'],
    'Девони ғазалиёт': ['Девони ғазалиёт'],
    'Ашъор': ['Бӯи Ҷӯи Мӯлиён'],
    'Шоҳнома (достонҳои интихобӣ)': ['Шоҳнома'],
}
# Demo books with made-up text and no real version here: removed at the start
REMOVE_DEMO = ['Ёддоштҳо']

# Smallest first, so the first books show up on the site quickly (all of them take hours on a laptop)
ORDER = ['Рубоиёт', 'Ашъор', 'Шоҳнома (достонҳои интихобӣ)', 'Гулистон',
         'Маснавии маънавӣ. Дафтари аввал', 'Бӯстон', 'Девони ғазалиёт']

# ---------- 1. Download ----------

def get_json(path):
    """GET from the Ganjoor API, with a file cache in data/ganjoor/."""
    os.makedirs(DATA_DIR, exist_ok=True)
    file_name = f'{DATA_DIR}/{hashlib.md5(path.encode()).hexdigest()}.json'
    if os.path.exists(file_name):
        with open(file_name, encoding='utf-8') as f:
            return json.load(f)

    request = urllib.request.Request(API + path, headers={'User-Agent': 'Shunav audiobooks (student project)'})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                data = json.load(response)
            break
        except (OSError, ValueError):
            if attempt == 5:
                raise
            time.sleep(5)

    with open(file_name + '.tmp', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(file_name + '.tmp', file_name)  # never leave a half-written file
    return data


def download_all(poem_ids):
    """Download many poems, 4 at a time (the API answers slowly, but in parallel it is fine)."""
    done = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for _ in pool.map(poem_lines, poem_ids):
            done += 1
            if done % 50 == 0:
                print(f'  downloaded {done}/{len(poem_ids)} poems', flush=True)


def poems_in_category(cat_id, only_own=False):
    """All poem ids of a category in reading order (sub-categories too, unless only_own)."""
    cat = get_json(f'/cat/{cat_id}?poems=true&mainSections=false')['cat']
    ids = [poem['id'] for poem in cat['poems'] or []]
    if not only_own:
        for child in cat['children'] or []:
            ids += poems_in_category(child['id'])
    return ids


def poem_lines(poem_id):
    """A poem as a list of lines: prose paragraphs, and each bayt as two half-lines (misra)."""
    poem = get_json(f'/poem/{poem_id}?catInfo=false&rhymes=false&recitations=false&images=false'
                    f'&songs=false&comments=false&verseDetails=true&navigation=false')
    lines = []
    for verse in poem['verses']:
        text = verse['text'].strip()
        if not text:
            continue
        if verse['versePosition'] == -1 and lines:  # prose paragraph: keep a blank line before it
            lines.append('')
        lines.append(text)
        if verse['versePosition'] in (-1, 1):  # after a prose paragraph or a full bayt: a blank line
            lines.append('')
    while lines and lines[-1] == '':
        lines.pop()
    return poem['title'], lines


# ---------- 2. Convert ----------

class Converter:
    """Persian script -> Tajik Cyrillic, remembering every piece it has already converted.

    Long prose lines are cut into short pieces at punctuation first: the model cuts off long input.
    """

    def __init__(self):
        self.cache = {}
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, encoding='utf-8') as f:
                self.cache = json.load(f)
        self.model = None

    @staticmethod
    def pieces(text):
        return [piece for piece in re.split(r'(?<=[.،:؛!؟])\s+', text) if piece]

    def convert_all(self, texts):
        todo = sorted({piece for text in texts if text for piece in self.pieces(text)} - set(self.cache))
        if not todo:
            return
        if self.model is None:
            try:
                from shekar import FarsiToTajik
            except ImportError:
                sys.exit('Install the converter first:  .venv/bin/pip install -r requirements-import.txt')
            self.model = FarsiToTajik(batch_size=32)

        step = 256
        for start in range(0, len(todo), step):
            batch = todo[start:start + step]
            for source, result in zip(batch, self.model(batch)):
                self.cache[source] = result
            self.save()
            print(f'  converted {min(start + step, len(todo))}/{len(todo)} pieces', flush=True)

    def __call__(self, text):
        if not text:
            return text
        result = []
        for piece in self.pieces(text):
            converted = self.cache.get(piece, piece).strip()
            # the model starts every piece with a capital letter; after a comma it must be small
            if result and result[-1].endswith(',') and converted:
                converted = converted[0].lower() + converted[1:]
            result.append(converted)
        return ' '.join(result)

    def save(self):
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, ensure_ascii=False)


def clean(text):
    """Small fixes after the model: Persian punctuation and digits."""
    text = text.replace('،', ',').replace('؛', ';').replace('؟', '?').replace('‌', '')
    return text.translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))


# ---------- 3. Build chapters and save ----------

def chapter_plan(book):
    """[(chapter title, [poem ids])] for one book."""
    if 'group' in book:
        label, cat_id, size = book['group']
        ids = poems_in_category(cat_id)
        return [(f'{label} {start + 1}–{min(start + size, len(ids))}', ids[start:start + size])
                for start in range(0, len(ids), size)]

    plan = []
    for title, kind, cat_id in book['chapters']:
        plan.append((title, poems_in_category(cat_id, only_own=(kind == 'poems_of'))))
    return plan


def tidy_line(line):
    """A half-bayt: no comma or period at the end (the model adds them), first letter capital."""
    if not line or len(line) > 80:  # prose paragraph: keep as it is
        return line
    line = line.rstrip(' ,.')
    if not line:  # the line was only punctuation (e.g. "...")
        return ''
    return line[0].upper() + line[1:]


def poem_heading(book, number, persian_title, convert):
    """'Ҳикояти 3' for numbered items, otherwise the poem's own title converted."""
    if book.get('item'):
        return f"{book['item']} {number}"
    title = re.sub(r'^بخش\s*[۰-۹0-9]+\s*-\s*', '', persian_title)  # "بخش ۱۲ - ..." -> "..."
    return clean(convert(title))


def build_text(book, poem_ids, convert, numbers):
    parts = []
    for poem_id in poem_ids:
        title, lines = poem_lines(poem_id)
        numbers[0] += 1
        heading = poem_heading(book, numbers[0], title, convert)
        body = '\n'.join(tidy_line(clean(convert(line))) for line in lines)
        body = re.sub(r'\n{3,}', '\n\n', body)  # at most one blank line in a row
        parts.append(f'◆ {heading}\n\n{body}')
    return '\n\n\n'.join(parts)


def book_texts(plan):
    """Every line (and poem title) of a book, in Persian, for the converter."""
    texts = []
    for _, poem_ids in plan:
        for poem_id in poem_ids:
            title, lines = poem_lines(poem_id)
            texts.append(re.sub(r'^بخش\s*[۰-۹0-9]+\s*-\s*', '', title))
            texts.extend(lines)
    return texts


def save_book(db, book, plan, convert):
    """Write one book with its chapters, replacing an older book with the same title (or its demo version)."""
    info = AUTHORS[book['author']]
    author = db.query(Author).filter(Author.name == info['name']).first()
    if author is None:
        author = Author(**info)
        db.add(author)

    category = db.query(Category).filter(Category.name == book['category']).first()
    if category is None:
        category = Category(name=book['category'])
        db.add(category)

    for title in [book['title']] + REPLACES.get(book['title'], []):
        for old in db.query(Book).filter(Book.title == title).all():
            db.delete(old)
    db.flush()

    new_book = Book(
        title=book['title'],
        description=book['description'] + NOTE,
        language='tg',
        license_type='public_domain',
        source_url=book['url'],
        author=author,
        category=category,
    )
    db.add(new_book)
    db.flush()

    numbers = [0]  # running number of stories/poems through the whole book
    for order, (chapter_title, poem_ids) in enumerate(plan, start=1):
        text = build_text(book, poem_ids, convert, numbers)
        db.add(Chapter(book_id=new_book.id, order=order, title=chapter_title, text=text, audio_status='pending'))

    # its cover (a miniature from The Met, see covers.py)
    from covers import cover_for
    new_book.cover = cover_for(book['title'])
    db.commit()


def main():
    """python import_books.py            -> all books
       python import_books.py Гулистон   -> only the books named"""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    convert = Converter()

    wanted = sys.argv[1:] or ORDER
    books = [book for title in ORDER for book in BOOKS if book['title'] == title and title in wanted]

    for title in REMOVE_DEMO:
        for old in db.query(Book).filter(Book.title == title).all():
            db.delete(old)
    db.commit()

    for book in books:
        print(f"\n== {book['title']} ==", flush=True)

        print('1. Downloading from Ganjoor (only what is not saved yet)...', flush=True)
        plan = chapter_plan(book)
        download_all([poem_id for _, poem_ids in plan for poem_id in poem_ids])

        print('2. Converting to Cyrillic...', flush=True)
        convert.convert_all(book_texts(plan))

        print('3. Saving to the database...', flush=True)
        save_book(db, book, plan, convert)
        print(f"Saved: {book['title']} ({len(plan)} chapters)", flush=True)

    print('\nDone.')

if __name__ == '__main__':
    main()
