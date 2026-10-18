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

# authors and books that import_books.py (Ganjoor) does not have
MORE_AUTHORS = {
    'ayni': dict(name='Садриддин Айнӣ', birth_year=1878, death_year=1954, bio='Асосгузори адабиёти навини тоҷик.'),
    'bedil': dict(name='Мирзо Абдулқодири Бедил', birth_year=1644, death_year=1720,
                  bio='Шоир ва мутафаккири бузург, устоди «сабки ҳиндӣ», ки дар Мовароуннаҳр хеле дӯсташ медоштанд.'),
}
RESTORED_NOTE = (' Матн аз нусхаи сканшуда бо барнома барқарор карда шудааст ва ҳанӯз санҷида нашудааст — '
                 'хатоҳо буда метавонанд.')
MASNAVI = 'Дафтари {}-и «Маснавии маънавӣ»-и Мавлоно Ҷалолиддини Балхӣ — ҳикоятҳо ва ҳикматҳои ирфонӣ.'
MORE_BOOKS = [
    dict(title='Шоҳнома. Ҷилди 1', author='ferdowsi', category='Достон',
         description='Ҷилди аввали «Шоҳнома»: аз оғози китоб ва подшоҳии Каюмарс то Ҷамшед, Заҳҳок, Фаридун ва '
                     'Манучеҳр, ишқи Золу Рӯдоба, зодани Рустам ва гирифтани Рахш.'),
    *[dict(title=f'Маснавии маънавӣ. Дафтари {n}', author='rumi', category='Достон', description=MASNAVI.format(word))
      for n, word in [('дуюм', 'дуюм'), ('сеюм', 'сеюм'), ('чаҳорум', 'чаҳорум'), ('панҷум', 'панҷум'), ('шашум', 'шашум')]],
    dict(title='Саду як ғазал', author='bedil', category='Ғазал',
         description='Саду як ғазали Мирзо Абдулқодири Бедил (нашри «Ирфон», 2008).' + RESTORED_NOTE),
    dict(title='Марги судхӯр', author='ayni', category='Наср',
         description='Қиссаи машҳури Садриддин Айнӣ (1937) дар бораи судхӯри хасис Қорӣ Ишкамба ва зиндагии '
                     'Бухорои пеш аз инқилоб.' + RESTORED_NOTE),
    dict(title='Мактаби кӯҳна', author='ayni', category='Наср',
         description='Қиссаи Садриддин Айнӣ (1934) дар бораи мактаби деҳаи кӯдакиаш: мактабдори бераҳм, фаллоқ, '
                     'бачагони шӯх ва падари доно, ки писарашро бо ҳисоби абҷад ва рақамҳо шинос мекунад.'),
    dict(title='Одина', author='ayni', category='Наср',
         description='Қиссаи Садриддин Айнӣ (1924) — саргузашти ҷавони камбағал Одина ва ишқи ӯ ба Гулбибӣ, '
                     'тасвири зиндагии деҳқонони тоҷик дар замони амирӣ.'),
    dict(title='Ёддоштҳо', author='ayni', category='Наср',
         description='«Ёддоштҳо»-и Садриддин Айнӣ (ҳар чор қисм) — хотироти нависанда аз кӯдакӣ дар деҳаи Соктаре '
                     'то солҳои таҳсил дар мадрасаҳои Бухоро: мардум, урфу одат ва зиндагии охири асри XIX.'),
]
NOTE = '\n\nМатн аз нашри тоҷикии китоб (kitobkhon.net) гирифта шудааст.'
WRAP = 64  # a prose line this long was cut by the page width; the next line goes on with it


RESTORED = {'bedil_gazal', 'margi_sudkhur'}  # scans whose text lost the Tajik letters (see tajik_restore.py)
_restorer = None


def pages(name):
    """{page number: [lines]} without the site header and the page number."""
    global _restorer
    text = open(f'{RAW}/{name}.txt', encoding='utf-8').read()
    if name in RESTORED:
        if _restorer is None:
            from tajik_restore import Restorer
            _restorer = Restorer()
        text = _restorer.text(text)
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
    # a word the PDF broke into two lines ("Шаҳ Ҳ" + "усомуддин, ки ...") is put back together
    joined = []
    for line in lines:
        last_word = joined[-1].split(' ')[-1] if joined and joined[-1] else ''
        if 0 < len(last_word) <= 2 and last_word[0].isupper() and line[:1].islower():
            joined[-1] += line
        else:
            joined.append(line)
    return joined


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


def read_masnavi(name='masnavi'):
    """A daftar of the Masnavi: its prose preface is left out (the verse starts at the first two short lines after it).
    After a blank line, a long prose line is a story heading (wrapped headings go on to the next line).
    15 stories in a chapter."""
    lines = all_lines(pages(name), 2)
    start = next(i for i in range(len(lines) - 1)
                 if lines[i] and lines[i + 1] and len(lines[i]) <= 46 and len(lines[i + 1]) <= 46
                 and not lines[i].startswith(('Муқаддима', 'Бисми')))
    lines = lines[start:]
    stories, heading, body = [], 'Бишнав аз най' if name == 'masnavi' else 'Оғози дафтар', []
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
                long_prose = len(after) >= 50  # verse lines are shorter
                if not long_prose and (after.endswith((',', ':', ';')) or not (after[0].islower() or len(parts[-1]) >= WRAP)):
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


SHOHNOMA_NAMES = ['каюмарс', 'сиёмак', 'ҳушанг', 'таҳмурас', 'ҷамшед', 'заҳҳок', 'фаридун', 'эраҷ', 'салм', 'тур', 'манучеҳр',
                  'сом', 'зол', 'рӯдоба', 'меҳроб', 'синдухт', 'рустам', 'нӯзар', 'пашанг', 'афросиёб', 'ағрирас', 'зав',
                  'таҳмосп', 'гаршосп', 'кова', 'иблис', 'яман', 'ҷандал', 'сарв', 'қорон', 'кокуй', 'кобулӣ', 'сипанд',
                  'рахш', 'маҳмуд', 'абӯмансур', 'муҳаммад', 'дақиқӣ', 'шоҳнома', 'алонон', 'рӯдобаро', 'фаридунро',
                  'заҳҳокро', 'манучеҳрро', 'золро', 'синдухтро', 'рахшро', 'ҷамшедро']


def small_caps(line):
    """Headings of this edition are printed in small capitals: in the text they come out as 'гуФтор андар'."""
    letters = re.sub(r'[^А-Яа-яЁёӢӣӮӯҲҳҚқҒғҶҷ]', '', line)
    return bool(letters) and (bool(re.search(r'[а-яёӣӯҳқғҷ][А-ЯЁӢӮҲҚҒҶ]', line)) or (letters.isupper() and len(letters) > 3))


def heading_case(text):
    """'кушта шудани сиЁмак бар дасти дЕв' -> 'Кушта шудани Сиёмак бар дасти дев'."""
    words = text.lower().split()
    words = [w.capitalize() if w.strip('«»"“”') in SHOHNOMA_NAMES else w for w in words]
    text = ' '.join(words)
    return text[:1].upper() + text[1:]


def read_shohnoma():
    """From 'Оғози китоб' to the contents at the end. Verse lines start with their number, words carry note numbers,
    notes are at the foot of the page ("1. И – ..."). Stories start with small-capital headings; about 20 000
    letters of stories make a chapter, named after its first story."""
    book_pages = pages('shohnoma')
    sections, heading, body = [], None, []
    for number in sorted(book_pages):
        if number < 23:
            continue
        page = book_pages[number]
        if sum('.....' in line for line in page) > 3:  # the contents: the end of the book
            break
        for line in page:
            if re.match(r'^\d+\.\s', line):  # notes to the end of the page
                break
            line = re.sub(r'^\d+\s+', '', line)  # verse number
            line = re.sub(r'(?<=[^\d\s])\d+(?=[\s.,!?;:»…]|$)', '', line).strip()  # note number in a word
            # verse lines start with a capital; heading lines (even without a capital in them) with a small letter
            if line and (small_caps(line) or line[0].islower()):
                if heading is not None and not any(body):  # a heading on two lines
                    heading = f'{heading} {line}'
                    continue
                if heading is not None:
                    sections.append((heading_case(heading), body))
                heading, body = line, []
            elif heading is not None:
                body.append(line)
        body.append('')
    sections.append((heading_case(heading), body))

    chapters, current, size = [], [], 0
    for item in sections:
        current.append(item)
        size += sum(len(l) for l in item[1])
        if size > 20000:
            chapters.append(current)
            current, size = [], 0
    if current:
        chapters.append(current)
    return [(group[0][0], '\n\n\n'.join(section(h, b) for h, b in group)) for group in chapters]


def capitals(line):
    """A heading of a prose book: in CAPITALS ('ҲУСНИ ТАБИӢ', 'ФЕВРАЛ – МАРТИ 1917')."""
    letters = re.sub(r'[^А-ЯЁӢӮҲҚҒҶа-яёӣӯҳқғҷ]', '', line)
    return len(line) < 70 and letters.isupper() and len(letters) > 3


def read_prose(name, first_page, first_part=None):
    """A prose book: 'ҚИСМИ ...' starts a part, other CAPITAL lines start a section. Lines cut by the page width are
    joined (and words cut with '-'); a paragraph ends at a short line that ends a sentence. Notes at the foot of a
    page ('1 Роиҷа – ...') and note numbers in words are left out; the book ends at its contents. About 25 000
    letters of sections make a chapter, named after its first section."""
    book_pages = pages(name)
    widths = sorted(len(l) for ls in book_pages.values() for l in ls if l)
    full = widths[int(len(widths) * 0.9)] * 0.85  # a line shorter than this ends a paragraph

    parts, part, sections, heading, paragraphs = [], first_part, [], None, []

    def close_section():
        if heading is not None and paragraphs:
            sections.append((heading, paragraphs[:]))

    for number in sorted(book_pages):
        if number < first_page:
            continue
        page = book_pages[number]
        if any(line.replace(' ', '') in ('МУНДАРИҶА', 'МУНДРИҶА') for line in page):
            break  # the contents: the end of the book
        for k, line in enumerate(page):
            if k > len(page) / 2 and re.match(r'^\d\s*[.)]?\s+\S', line):
                break  # notes to the end of the page
            line = re.sub(r'(?<=[^\d\s])\d+(?=[\s.,!?;:»…]|$)', '', line).strip()
            if not line:
                continue
            if re.match(r'^ҚИСМИ ', line):
                close_section()
                if sections:
                    parts.append((part, sections))
                part, sections, heading, paragraphs = line.capitalize(), [], None, []
            elif capitals(line):
                if heading is not None and not paragraphs:  # a heading on two lines
                    heading = f'{heading} {line.lower()}'
                    continue
                close_section()
                heading, paragraphs = line.capitalize(), []
            else:
                if heading is None:
                    heading = part or 'Оғоз'
                if paragraphs and paragraphs[-1][1]:  # the last paragraph goes on
                    text = paragraphs[-1][0]
                    text = text[:-1] + line if text.endswith('-') and line[:1].islower() else f'{text} {line}'
                    paragraphs[-1] = (text, True)
                else:
                    paragraphs.append((line, True))
                if len(line) < full and line.endswith(('.', '!', '?', '»', ':', '…')):  # a short line ends it
                    paragraphs[-1] = (paragraphs[-1][0], False)
    close_section()
    if sections:
        parts.append((part, sections))

    chapters = []
    for part_title, part_sections in parts:
        group, size = [], 0
        for heading, paras in part_sections:
            group.append((heading, '\n\n'.join(text for text, _ in paras)))
            size += sum(len(text) for text, _ in paras)
            if size > 25000:
                chapters.append((part_title, group))
                group, size = [], 0
        if group:
            chapters.append((part_title, group))
    return [(f'{part_title}: {group[0][0]}' if part_title else group[0][0],
             '\n\n\n'.join(f'◆ {h}\n\n{t}' for h, t in group)) for part_title, group in chapters]


def read_bedil_gazal():
    """One ghazal on each page (5–104); the book's name and an ornament at the foot of every page are left out."""
    book_pages = pages('bedil_gazal')
    ghazals = []
    for number in range(5, 105):
        lines = [l for l in book_pages.get(number, [])
                 if len(re.findall(r'[А-Яа-яЁёӢӣӮӯҲҳҚқҒғҶҷ]', l)) >= 6 and not re.fullmatch(r'(\S ){4,}\S?', l)
                 and 'www' not in l]
        if lines:
            ghazals.append(lines)
    chapters = []
    for start in range(0, len(ghazals), 25):
        group = ghazals[start:start + 25]
        text = '\n\n\n'.join(section(f'Ғазали {start + n + 1}', g) for n, g in enumerate(group))
        chapters.append((f'Ғазалҳои {start + 1}–{start + len(group)}', text))
    return chapters


def read_typed(folder):
    """A book typed page by page from scans (data/texts/<folder>/NNN.txt, notes in _notes.txt).
    '◆ ' lines start the sections; every section is one chapter."""
    import glob
    text = '\n\n'.join(open(f, encoding='utf-8').read().strip()
                       for f in sorted(glob.glob(f'data/texts/{folder}/[0-9]*.txt')))
    # a page that ends in the middle of a word with '-' goes on in the next page
    text = re.sub(r'-\n\n(?=[а-яёӣӯҳқғҷ])', '', text)
    # a page that ends in the middle of a sentence goes on in the first paragraph of the next page
    text = re.sub(r'^(?!◆)(.*[^.!?:…»\n])\n\n(?=[а-яёӣӯҳқғҷ])', r'\1 ', text, flags=re.M)
    parts = re.split(r'^◆ (.+)$', text, flags=re.M)
    sections = [(parts[i], parts[i + 1].strip()) for i in range(1, len(parts), 2)]
    return [(heading, f'◆ {heading}\n\n{body}') for heading, body in sections]


READERS = {
    'buston': ('Бӯстон', read_buston),
    'hofiz': ('Девони ғазалиёт', read_hofiz),
    'masnavi': ('Маснавии маънавӣ. Дафтари аввал', read_masnavi),
    'ruboiyot': ('Рубоиёт', read_ruboiyot),
    'rudaki': ('Ашъор', read_rudaki),
    'shohnoma': ('Шоҳнома. Ҷилди 1', read_shohnoma),
    'odina': ('Одина', lambda: read_prose('odina', 3)),
    'maktabi_kuhna': ('Мактаби кӯҳна', lambda: read_typed('maktabi_kuhna')),
    'bedil_gazal': ('Саду як ғазал', read_bedil_gazal),
    'yoddoshtho4': ('Ёддоштҳо', lambda: read_prose('yoddoshtho4', 3, 'Қисми якум')),
    **{f'masnavi{n}': (f'Маснавии маънавӣ. Дафтари {word}', lambda n=n: read_masnavi(f'masnavi{n}'))
       for n, word in [(2, 'дуюм'), (3, 'сеюм'), (4, 'чаҳорум'), (5, 'панҷум'), (6, 'шашум')]},
}


def save(db, title, chapters):
    book = next(b for b in BOOKS + MORE_BOOKS if b['title'] == title)
    info = {**AUTHORS, **MORE_AUTHORS}[book['author']]
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
