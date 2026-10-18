import os
import uuid
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from config import MEDIA_DIR
from models import Book


def get_or_404(db: Session, model, pk: int):
    obj = db.get(model, pk)
    if obj is None:
        raise HTTPException(status_code=404, detail=f'{model.__name__} #{pk} not found')
    return obj


def get_visible_book(db: Session, book_id: int) -> Book:
    book = db.get(Book, book_id)
    if book is None or not book.is_published:
        raise HTTPException(status_code=404, detail=f'Book #{book_id} not found')
    return book


def save_file(file: UploadFile, folder: str, allowed_types: dict) -> str:
    extension = allowed_types.get(file.content_type)
    if extension is None:
        raise HTTPException(status_code=400, detail=f'File type {file.content_type} is not allowed')

    os.makedirs(f'{MEDIA_DIR}/{folder}', exist_ok=True)
    file_name = uuid.uuid4().hex + extension
    path = f'{MEDIA_DIR}/{folder}/{file_name}'

    with open(path, 'wb') as out:
        while chunk := file.file.read(1024 * 1024):  # 1 MB at a time, so big audio does not fill memory
            out.write(chunk)

    return '/' + path


def delete_file(url: str | None):
    if url:
        path = url.lstrip('/')
        if os.path.isfile(path):
            os.remove(path)


TAJIK_ALPHABET = 'абвгғдеёжзиӣйкқлмнопрстуӯфхҳчҷшъэюя'


def tajik_sort_key(text: str):
    """Sort words in Tajik alphabet order (SQLite would put Ё, Ғ, Ҳ ... in the wrong places)."""
    return [TAJIK_ALPHABET.find(letter) if letter in TAJIK_ALPHABET else 100 + ord(letter) for letter in text.lower()]


# ---------- Search in any language and spelling ----------
# The same name is written many ways: Рӯдакӣ / Рудаки / Rudaki, Ҳофиз / Хафиз / Hafez, Гулистон / Gulistan.
# Both the search and the text are turned into the same plain Latin form (Tajik letters -> their Russian
# look-alikes -> Latin), and then also into a "skeleton" without vowels, so о/а/е differences do not matter.
# The skeleton is only used for searches of 3+ consonants, otherwise "ра" would find everything with an "р".

CYRILLIC_TO_LATIN = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'ғ': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z',
    'и': 'i', 'ӣ': 'i', 'й': 'i', 'к': 'k', 'қ': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
    'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ӯ': 'u', 'ф': 'f', 'х': 'h', 'ҳ': 'h', 'ц': 'ts', 'ч': 'ch',
    'ҷ': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ь': '', 'ы': 'i', 'э': 'e', 'ю': 'iu', 'я': 'ia',
}

# Latin spellings that sound the same (the order matters: longer ones first)
LATIN_SAME_SOUND = [('dzh', 'ch'), ('dj', 'ch'), ('kh', 'h'), ('gh', 'g'), ('ph', 'f'), ('sch', 'sh'),
                    ('ou', 'u'), ('ee', 'i'), ('j', 'ch'), ('x', 'h'), ('q', 'k'), ('w', 'v'), ('y', 'i'), ('c', 'k')]

# Russian and English names, so "Rudaki", "Хафиз", "Shahnameh" or "poetry" find the Tajik book.
# Key = a piece of the Tajik title / name / genre.
SEARCH_ALIASES = {
    'Гулистон': 'Гулистан Gulistan Golestan',
    'Бӯстон': 'Бустан Bustan Bostan',
    'Шоҳнома': 'Шахнаме Шахнама Shahnameh Shahnama',
    'Рубоиёт': 'Рубаи Рубайат Рубайят Rubaiyat',
    'Ашъор': 'Стихи Poems',
    'Девони ғазалиёт': 'Диван газели Divan Ghazals',
    'Маснавӣ': 'Маснави Месневи Masnavi Mathnawi',
    'Рӯдакӣ': 'Рудаки Rudaki Rudagi',
    'Фирдавсӣ': 'Фирдоуси Ferdowsi Firdausi Firdousi',
    'Хайём': 'Хайям Омар Khayyam Omar',
    'Ҳофиз': 'Хафиз Hafez Hafiz',
    'Саъдӣ': 'Саади Saadi Sadi',
    'Саъдии': 'Саади Saadi Sadi',
    'Румӣ': 'Руми Джалаледдин Rumi Jalaluddin Jalal',
    'Айнӣ': 'Айни Ayni Aini',
    'Достон': 'Эпос Epic',
    'Наср': 'Проза Prose',
    'Рубоӣ': 'Рубаи Rubai',
    'Шеър': 'Стихи Поэзия Poetry Poems',
    'Ғазал': 'Газель Газели Ghazal',
}


def plain_latin(text: str) -> str:
    text = ''.join(CYRILLIC_TO_LATIN.get(letter, letter) for letter in (text or '').lower())
    for old, new in LATIN_SAME_SOUND:
        text = text.replace(old, new)
    text = ''.join(letter if letter.isalnum() else ' ' for letter in text)
    # double letters count once (Khayyam = Khayam)
    text = ''.join(letter for i, letter in enumerate(text) if i == 0 or letter != text[i - 1])
    return ' '.join(text.split())


def skeleton(text: str) -> str:
    return ''.join(letter for letter in text if letter not in 'aeiou ')


def with_aliases(*texts: str | None) -> str:
    text = ' '.join(t for t in texts if t)
    extra = [names for key, names in SEARCH_ALIASES.items() if key.lower() in text.lower()]
    return ' '.join([text, *extra])


def matches_search(search: str, *texts: str | None) -> bool:
    """Does any of the texts (title, author, genre...) contain the search, in any language or spelling?"""
    wanted = plain_latin(search)
    if not wanted:
        return True
    where = plain_latin(with_aliases(*texts))
    if wanted in where:
        return True
    wanted_skeleton = skeleton(wanted)
    return len(wanted_skeleton) >= 3 and wanted_skeleton in skeleton(where)
