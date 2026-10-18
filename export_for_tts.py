"""Chapter texts for the natural AI voice (tts_colab.ipynb runs it on a free Google Colab GPU).

    .venv\\Scripts\\python export_for_tts.py              # every chapter -> data/tts/chapters.json
    .venv\\Scripts\\python export_for_tts.py Рубоиёт      # only these books (titles)

Upload data/tts/chapters.json and a voice recording (voice.wav) to the Google Drive folder "shunav_tts",
run the notebook, then bring the audio back with import_audio.py.
"""
import json
import os
import sys

from database import SessionLocal
from models import Book, Chapter

OUT = 'data/tts/chapters.json'


def main(titles: list[str]):
    db = SessionLocal()
    query = db.query(Chapter).join(Book).filter(Chapter.text.isnot(None))
    if titles:
        query = query.filter(Book.title.in_(titles))
    chapters = [
        {'id': chapter.id, 'book': chapter.book.title, 'order': chapter.order, 'title': chapter.title, 'text': chapter.text}
        for chapter in query.order_by(Book.id, Chapter.order)
    ]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as out:
        json.dump(chapters, out, ensure_ascii=False, indent=1)
    letters = sum(len(chapter['text']) for chapter in chapters)
    print(f'{OUT}: {len(chapters)} chapters, {letters:,} letters (about {letters / 12 / 3600:.0f} hours of audio)')


if __name__ == '__main__':
    main(sys.argv[1:])
