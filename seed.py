
import math
import os
import struct
import uuid
import wave

from auth import hash_password
from config import MEDIA_DIR
from database import Base, SessionLocal, engine
from models import Author, Book, Category, Chapter, Narrator, Review, User

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(Book).first():
    raise SystemExit('Database already has books, nothing to do.')


def make_demo_audio(seconds: int) -> str:
    os.makedirs(f'{MEDIA_DIR}/audio', exist_ok=True)
    path = f'{MEDIA_DIR}/audio/demo-{uuid.uuid4().hex[:8]}.wav'
    rate = 8000
    with wave.open(path, 'wb') as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        frames = bytearray()
        for i in range(seconds * rate):
            frames += struct.pack('<h', int(1500 * math.sin(2 * math.pi * 220 * i / rate)))
        out.writeframes(bytes(frames))
    return '/' + path


admin = User(name='Админ', username='admin', email='admin@shunav.tj', password_hash=hash_password('admin123'), is_admin=True)
demo = User(name='Фаррух', username='demo', email='demo@shunav.tj', password_hash=hash_password('demo123'))
db.add_all([admin, demo])

categories = {name: Category(name=name) for name in ['Шеър', 'Наср', 'Достон', 'Ғазал', 'Рубоӣ']}
db.add_all(categories.values())

saadi = Author(name='Саъдии Шерозӣ', birth_year=1213, death_year=1291, bio='Шоир ва нависандаи бузурги форсу тоҷик, муаллифи «Гулистон» ва «Бӯстон».')
ferdowsi = Author(name='Абулқосим Фирдавсӣ', birth_year=940, death_year=1020, bio='Муаллифи «Шоҳнома», бузургтарин достони қаҳрамонии форсу тоҷик.')
khayyam = Author(name='Умари Хайём', birth_year=1048, death_year=1131, bio='Шоир, риёзидон ва ситорашиноси машҳур, устоди рубоӣ.')
hafez = Author(name='Ҳофизи Шерозӣ', birth_year=1325, death_year=1390, bio='Устоди бузурги ғазал.')
rudaki = Author(name='Абӯабдуллоҳи Рӯдакӣ', birth_year=858, death_year=941, bio='Одамушшуаро — падари шеъри форсу тоҷик.')
ayni = Author(name='Садриддин Айнӣ', birth_year=1878, death_year=1954, bio='Асосгузори адабиёти навини тоҷик.')
db.add_all([saadi, ferdowsi, khayyam, hafez, rudaki, ayni])

ai_voice = Narrator(name='Овози AI (тоҷикӣ)', kind='ai', tts_model='facebook/mms-tts-tgk')
db.add(ai_voice)
db.flush()

BOOKS = [
    {
        'title': 'Гулистон', 'author': saadi, 'category': 'Наср', 'demo_audio': True,
        'description': '«Гулистон» — шоҳкори насри мусаҷҷаъ ва пандомӯзи Саъдии Шерозӣ (соли 1258). '
                       'Асар аз дебоча ва ҳашт боб иборат буда, дар бораи ахлоқ, қаноат ва тарбия ҳикоят мекунад.',
        'chapters': [
            ('Дебоча', 'Миннат Худойро азза ва ҷалла, ки тоаташ мӯҷиби қурбат аст ва ба шукр андараш мазиди неъмат.'),
            ('Боби аввал: Дар сирати подшоҳон', 'Бани одам аъзои якдигаранд,\nКи дар офариниш зи як гавҳаранд.\nЧу узве ба дард оварад рӯзгор,\nДигар узвҳоро намонад қарор.'),
            ('Боби дуввум: Дар ахлоқи дарвешон', 'Ҳикоят: Яке аз бузургон гуфт...'),
        ],
    },
    {
        'title': 'Шоҳнома', 'author': ferdowsi, 'category': 'Достон',
        'description': 'Достони бузурги қаҳрамонӣ дар бораи подшоҳону паҳлавонони Эрон ва Турон.',
        'chapters': [
            ('Оғози сухан', 'Ба номи Худованди ҷону хирад,\nКаз ин бартар андеша барнагзарад.'),
            ('Достони Рустам ва Сӯҳроб', 'Кунун разми Сӯҳробу Рустам шунав,\nДигарҳо шунидастӣ, ин ҳам шунав.'),
        ],
    },
    {
        'title': 'Рубоиёт', 'author': khayyam, 'category': 'Рубоӣ',
        'description': 'Андешаҳои фалсафӣ дар бораи ҳаёт, ишқ ва фурсати гаронбаҳои умр.',
        'chapters': [
            ('Рубоиёти интихобӣ', 'Ин қофила-и умр аҷаб мегузарад,\nДарёб даме, ки бо тараб мегузарад.'),
        ],
    },
    {
        'title': 'Девони ғазалиёт', 'author': hafez, 'category': 'Ғазал',
        'description': 'Ғазалҳои ошиқона ва ирфонии Ҳофизи Шерозӣ.',
        'chapters': [
            ('Ғазали аввал', 'Аля, ё айюҳассоқӣ, адир каъсан ва новилҳо,\nКи ишқ осон намуд аввал, вале афтод мушкилҳо.'),
        ],
    },
    {
        'title': 'Бӯи Ҷӯи Мӯлиён', 'author': rudaki, 'category': 'Шеър',
        'description': 'Шеърҳои машҳури Рӯдакӣ, падари шеъри форсу тоҷик.',
        'chapters': [
            ('Бӯи Ҷӯи Мӯлиён', 'Бӯи Ҷӯи Мӯлиён ояд ҳаме,\nЁди ёри меҳрубон ояд ҳаме.'),
        ],
    },
    {
        'title': 'Ёддоштҳо', 'author': ayni, 'category': 'Наср',
        'description': 'Хотираҳои Садриддин Айнӣ дар бораи ҳаёти Бухорои охири асри XIX.',
        'chapters': [
            ('Қисми аввал', 'Ман дар деҳаи Соктареи Ғиҷдувон ба дунё омадаам...'),
        ],
    },
]

for info in BOOKS:
    book = Book(
        title=info['title'],
        description=info['description'],
        author=info['author'],
        category=categories[info['category']],
        narrator=ai_voice,
    )
    db.add(book)
    db.flush()

    for number, (title, text) in enumerate(info['chapters'], start=1):
        chapter = Chapter(book_id=book.id, order=number, title=title, text=text)
        if info.get('demo_audio'):
            chapter.audio_file = make_demo_audio(30)
            chapter.duration_seconds = 30
            chapter.audio_status = 'done'
        db.add(chapter)

    db.add(Review(user=admin, book=book, rating=5, text='Шоҳасари адабиёти мо.'))

db.commit()
print('Done. Admin: admin / admin123, user: demo / demo123')
