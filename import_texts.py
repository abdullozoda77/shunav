"""Books from Tajik Cyrillic texts (kitobkhon.net PDFs) instead of the automatic Persian -> Cyrillic conversion.

    python pdf_to_text.py book.pdf data/texts/raw/<name>.txt     # once per PDF
    .venv\\Scripts\\python import_texts.py                       # every book below that has its text
    .venv\\Scripts\\python import_texts.py buston hofiz          # only these

Each book has its own small reader (where the book starts, how chapters and stories are marked).
A book replaces the one with the same title, like import_books.py does; its audio has to be made again.
"""
import re
import sys

from covers import cover_for
from database import SessionLocal
from import_books import AUTHORS, BOOKS, REPLACES
from models import Author, Book, Category, Chapter

RAW = 'data/texts/raw'
NOTE = '\n\nМатн аз нашри тоҷикии китоб (kitobkhon.net) гирифта шудааст.'
WRAP = 64  # a prose line this long was cut by the page width; the next line goes on with it


def pages(name):
    """{page number: [lines]} without the site header and the page number."""
    text = open(f'{RAW}/{name}.txt', encoding='utf-8').read()
    parts = re.split(r'=== page (\d+) ===\n', text)[1:]
    out = {}
    for number, body in zip(parts[0::2], parts[1::2]):
        lines = []
        for line in body.split('\n'):
            line = re.sub(r'\s+', ' ', line).strip()
            if re.fullmatch(r'(www\.sattor\.com)?\s*\d*', line):
                line = ''
            lines.append(line)
        out[int(number)] = lines
    return out


def all_lines(book_pages, first_page):
    lines = []
    for number in sorted(book_pages):
        if number >= first_page:
            lines.extend(book_pages[number] + [''])
    return lines


def tidy(lines):
    """Lines of one section -> text: verse lines stay, wrapped prose lines are joined, one blank line at most."""
    out = []
    for line in lines:
        if out and out[-1] and len(out[-1]) >= WRAP and line and not out[-1].endswith(('.', '!', '?', ':')):
            out[-1] = out[-1][:-1] + line if out[-1].endswith('-') else f'{out[-1]} {line}'
        else:
            out.append(line)
    text = '\n'.join(out).strip()
    return re.sub(r'\n{3,}', '\n\n', text)


def section(heading, lines):
    return f'◆ {heading}\n\n{tidy(lines)}'


# ---------- one reader per book: [(chapter title, chapter text)] ----------

def read_buston():
    """'Боби якум' + its subject on the next line start a chapter; 'Ҳикоят' lines start a story."""
    lines = all_lines(pages('buston'), 3)
    end = next(i for i, line in enumerate(lines) if line.startswith('Луғатҳо'))
    # the usual chapter names (the subject lines in this edition differ and one is missing)
    names = iter(title for title, _, _ in next(b for b in BOOKS if b['title'] == 'Бӯстон')['chapters'][1:])
    chapters, title, sections, heading, body, story = [], 'Дебоча', [], 'Дар сабаби назм ва таълифи «Бӯстон»', [], 0
    i = 1  # line 0 is the first heading itself
    while i < end:
        line = lines[i]
        if re.fullmatch(r'Боби \S+', line):
            sections.append(section(heading, body))
            chapters.append((title, '\n\n\n'.join(sections)))
            title = next(names)
            title, sections, heading, body, story = title, [], title.split(': ', 1)[1], [], 0
            if lines[i + 1]:  # this edition's own subject line under "Боби ..."
                i += 1
            i += 1
            continue
        if re.fullmatch(r'Ҳикояти?( .{0,60})?', line) and not line.endswith(('.', ',', '!', '?', ':', ';')):
            if body and any(body):
                sections.append(section(heading, body))
            story += 1
            heading, body = (line if line != 'Ҳикоят' else f'Ҳикояти {story}'), []
        else:
            body.append(line)
        i += 1
    sections.append(section(heading, body))
    chapters.append((title, '\n\n\n'.join(sections)))
    return chapters


def read_hofiz():
    """Ghazals are divided by '***'; 25 of them in a chapter."""
    lines = all_lines(pages('hofiz'), 2)
    ghazals, current = [], []
    for line in lines:
        if line == '***':
            if any(current):
                ghazals.append(current)
            current = []
        else:
            current.append(line)
    if any(current):
        ghazals.append(current)
    chapters = []
    for start in range(0, len(ghazals), 25):
        group = ghazals[start:start + 25]
        text = '\n\n\n'.join(section(f'Ғазали {start + n + 1}', g) for n, g in enumerate(group))
        chapters.append((f'Ғазалҳои {start + 1}–{start + len(group)}', text))
    return chapters


def read_masnavi():
    """After a blank line, a long prose line is a story heading (wrapped headings go on to the next line).
    15 stories in a chapter."""
    lines = all_lines(pages('masnavi'), 1)
    start = next(i for i, line in enumerate(lines) if line.startswith('Бишнав аз най'))
    lines = lines[start:]
    stories, heading, body = [], 'Бишнав аз най', []
    i = 0
    while i < len(lines):
        line = lines[i]
        previous_blank = i == 0 or not lines[i - 1]
        if previous_blank and len(line) > 46:
            if any(body):
                stories.append((heading, body))
            parts = [line]
            # a heading cut by the page width goes on in the next line (even after a page break): a line that
            # starts with a small letter, or follows a full-width line and does not end like a verse (, : ;)
            while not parts[-1].endswith(('.', '!', '?')):
                following = next((j for j in range(i + 1, min(i + 4, len(lines))) if lines[j]), None)
                if following is None:
                    break
                after = lines[following]
                if not (after[0].islower() or (len(parts[-1]) >= WRAP and not after.endswith((',', ':', ';')))):
                    break
                i = following
                parts.append(after)
            heading, body = ' '.join(parts), []
        else:
            body.append(line)
        i += 1
    if any(body):
        stories.append((heading, body))
    chapters = []
    for first in range(0, len(stories), 15):
        group = stories[first:first + 15]
        text = '\n\n\n'.join(section(h, b) for h, b in group)
        chapters.append((f'Қисмҳои {first + 1}–{first + len(group)}', text))
    return chapters


RUSSIAN_WORDS = {'что', 'все', 'всё', 'как', 'мне', 'ты', 'его', 'это', 'так', 'меня', 'тебя', 'без', 'кто', 'где',
                 'когда', 'если', 'бы', 'же', 'ли', 'уже', 'мой', 'твой', 'нас', 'нам', 'очевидно', 'был', 'была'}


def russian(line):
    """A line of the Russian translations printed next to the poems (only Russian has ы ь щ and these words)."""
    if re.search('[ыьщЫЬЩ]', line):
        return True
    if re.search('[ӣӯҳқғҷӢӮҲҚҒҶ]', line):
        return False
    return bool(set(re.findall(r'[а-яё]+', line.lower())) & RUSSIAN_WORDS)


def rhyme(line):
    return re.sub(r'[^а-яёӣӯҳқғҷ]', '', line.lower())[-2:]


def group_quatrains(lines):
    """Verse lines -> rubais of 4 lines, by their rhyme (AABA); a stray line between them is skipped."""
    quatrains, p = [], 0
    while p + 4 <= len(lines):
        for skip in range(3):
            window = lines[p + skip:p + skip + 4]
            if len(window) == 4:
                a, b, _, d = (rhyme(l) for l in window)
                if a == b or b == d or a == d:
                    quatrains.append(window)
                    p += skip + 4
                    break
        else:
            quatrains.append(lines[p:p + 4])
            p += 4
    return quatrains


def read_ruboiyot():
    """Tajik quatrains with Russian translations between them and word notes at the foot of the page.
    The Tajik lines are put into fours by their rhyme (a rubai rhymes AABA), skipping a stray line if needed."""
    book_pages = pages('ruboiyot')
    lines = []
    for number in sorted(book_pages):
        if number < 3 or number >= 231:  # the title pages and the back page
            continue
        page = book_pages[number]
        for k, line in enumerate(page):  # notes: from "1 Word – meaning" to the end of the page
            if re.match(r'^\d+\s*\S.*[–-]', line):
                page = page[:k]
                break
        block = []
        for line in page + ['']:
            line = re.sub(r'^\*\s*\*\s*\*\s*', '', line)
            if line:
                block.append(line)
                continue
            if block and not any(re.search('[ыьщЫЬЩ]', l) for l in block):
                block = [l for l in block if not russian(l)]
                if block and not block[0][0].islower() and all(len(l) <= 55 for l in block):  # not a note going on
                    lines.extend(re.sub(r'(?<=[^\d\s])\d+', '', l) for l in block)  # note numbers: "Талқин1"
            block = []

    quatrains = group_quatrains(lines)
    chapters = []
    for start in range(0, len(quatrains), 25):
        group = quatrains[start:start + 25]
        text = '\n\n\n'.join(f'◆ Рубоии {start + n + 1}\n\n' + '\n'.join(q) for n, q in enumerate(group))
        chapters.append((f'Рубоиҳои {start + 1}–{start + len(group)}', text))
    return chapters


def page_lines(book_pages, first, last):
    """[(page, line)] from these pages, without the notes at the foot ("1. ...") and note numbers in words."""
    out = []
    for number in range(first, last + 1):
        for line in book_pages.get(number, []):
            if re.match(r'^\d+\.\s', line):
                break
            out.append((number, re.sub(r'(?<=[^\d\s.])\d+(?=[\s.,!?;:»…]|$)', '', line)))
        out.append((number, ''))
    return out


def split_stars(lines):
    """Poems divided by '* * *' -> [[lines]]."""
    poems, current = [], []
    for line in lines + ['* * *']:
        if re.fullmatch(r'\*\s*\*\s*\*', line):
            if any(current):
                poems.append(current)
            current = []
        else:
            current.append(line)
    return poems


def read_rudaki():
    """Four parts. Qasidas and qit'as: a new poem where a line is the first line of one of the poems of the older
    (Ganjoor) "Ашъор" — compared in a spelling-free way (utils.plain_latin), since the pages do not mark them.
    Rubais: by rhyme. Scattered verses and masnavi pieces: divided by '* * *'."""
    from difflib import SequenceMatcher

    from utils import plain_latin

    book_pages = pages('rudaki')
    db = SessionLocal()
    older = db.query(Book).filter(Book.title == 'Ашъор').first()
    first_lines = []
    if older:
        for chapter in older.chapters:
            for body in re.split(r'^◆ .*$', chapter.text, flags=re.M)[1:]:
                line = next((l for l in body.split('\n') if l.strip()), '')
                first_lines.append(plain_latin(line)[:40])

    def starts_poem(line):
        key = plain_latin(line)[:40]
        return len(key) > 10 and any(SequenceMatcher(None, key, known).ratio() > 0.8 for known in first_lines)

    def same_line(a, b):
        return SequenceMatcher(None, plain_latin(a)[:40], plain_latin(b)[:40]).ratio() > 0.8

    poems = []
    for _, line in page_lines(book_pages, 50, 186):
        if re.fullmatch(r'\*\s*\*\s*\*', line):
            poems.append([])
        # (a poem can end by repeating its own first line: that is not a new poem)
        elif line and (not poems or (starts_poem(line) and not same_line(line, next((l for l in poems[-1] if l), '')))):
            poems.append([line])
        elif poems:
            poems[-1].append(line)
    poems = [p for p in poems if any(p)]

    def chapters_of(items, label, heading, size):
        out = []
        starts = list(range(0, len(items), size))
        if len(starts) > 1 and len(items) - starts[-1] < size // 4:  # a few left over: into the chapter before
            starts.pop()
        for k, start in enumerate(starts):
            group = items[start:starts[k + 1] if k + 1 < len(starts) else len(items)]
            text = '\n\n\n'.join(section(f'{heading} {start + n + 1}', item) for n, item in enumerate(group))
            title = label if len(items) <= size else f'{label} {start + 1}–{start + len(group)}'
            out.append((title, text))
        return out

    rubais = group_quatrains([l for _, l in page_lines(book_pages, 188, 222) if l and not l.startswith('*')])
    scattered = split_stars([l for _, l in page_lines(book_pages, 224, 326)])
    masnavi = split_stars([l for _, l in page_lines(book_pages, 328, 356)])
    return (chapters_of(poems, 'Қасидаҳо ва қитъаҳо', 'Шеъри', 30)
            + chapters_of(rubais, 'Рубоиёт', 'Рубоии', 50)
            + chapters_of(scattered, 'Абёти пароканда', 'Порчаи', 60)
            + chapters_of(masnavi, 'Порчаҳои маснавӣ ва достонҳо', 'Порчаи', 100))


READERS = {
    'buston': ('Бӯстон', read_buston),
    'hofiz': ('Девони ғазалиёт', read_hofiz),
    'masnavi': ('Маснавии маънавӣ. Дафтари аввал', read_masnavi),
    'ruboiyot': ('Рубоиёт', read_ruboiyot),
    'rudaki': ('Ашъор', read_rudaki),
}


def save(db, title, chapters):
    book = next(b for b in BOOKS if b['title'] == title)
    info = AUTHORS[book['author']]
    author = db.query(Author).filter(Author.name == info['name']).first() or Author(**info)
    category = db.query(Category).filter(Category.name == book['category']).first() or Category(name=book['category'])
    for old_title in [title] + REPLACES.get(title, []):
        for old in db.query(Book).filter(Book.title == old_title).all():
            db.delete(old)
    db.flush()
    new_book = Book(title=title, description=book['description'] + NOTE, language='tg', license_type='public_domain',
                    source_url='https://kitobkhon.net', author=author, category=category, cover=cover_for(title))
    db.add(new_book)
    db.flush()
    for order, (chapter_title, text) in enumerate(chapters, start=1):
        db.add(Chapter(book_id=new_book.id, order=order, title=chapter_title, text=text, audio_status='pending'))
    db.commit()


def main(names):
    db = SessionLocal()
    for name in names or READERS:
        title, reader = READERS[name]
        chapters = reader()
        save(db, title, chapters)
        sections = sum(text.count('◆ ') for _, text in chapters)
        print(f'{title}: {len(chapters)} chapters, {sections} poems/stories, {sum(len(t) for _, t in chapters):,} letters')


if __name__ == '__main__':
    main(sys.argv[1:])
