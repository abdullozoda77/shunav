"""Bring the audio made by tts_colab.ipynb into the site.

The notebook names every file by the chapter id: 12.mp3, 13.mp3 ... Download the "audio" folder from
Google Drive (shunav_tts/audio), then:

    .venv\\Scripts\\python import_audio.py "C:\\Users\\me\\Downloads\\audio"

Each file is copied to media/audio/, its real length is read, and the chapter is marked "done" with the
natural voice as the narrator of its book. Running it again replaces the audio of those chapters.
"""
import os
import shutil
import sys
import uuid

from mutagen.mp3 import MP3

from config import MEDIA_DIR
from database import SessionLocal
from models import Chapter, Narrator

ENGINES = {  # the engine chosen in the notebook -> (model, narrator name on the site)
    'chatterbox': ('Tohirju/chatterbox-mtl-tajik', 'Овози табиӣ (AI)'),
    'mms': ('facebook/mms-tts-tgk', 'Овози AI (тоҷикӣ)'),
}


def main(folder: str, engine: str = 'chatterbox'):
    model, name = ENGINES[engine]
    db = SessionLocal()
    narrator = db.query(Narrator).filter(Narrator.tts_model == model).first()
    if narrator is None:
        narrator = Narrator(name=name, kind='ai', tts_model=model)
        db.add(narrator)

    os.makedirs(f'{MEDIA_DIR}/audio', exist_ok=True)
    files = sorted(name for name in os.listdir(folder) if name.endswith('.mp3') and name[:-4].isdigit())
    done = 0
    for name in files:
        chapter = db.get(Chapter, int(name[:-4]))
        if chapter is None:
            print(f'{name}: no such chapter, skipped')
            continue

        path = f'{MEDIA_DIR}/audio/{uuid.uuid4().hex}.mp3'
        shutil.copyfile(os.path.join(folder, name), path)
        if chapter.audio_file and os.path.exists(chapter.audio_file.lstrip('/')):
            os.remove(chapter.audio_file.lstrip('/'))

        chapter.audio_file = '/' + path
        chapter.duration_seconds = round(MP3(path).info.length)
        chapter.audio_status = 'done'
        chapter.book.narrator = narrator
        db.commit()
        done += 1
        print(f'{chapter.book.title} — {chapter.title}: {chapter.duration_seconds // 60} min')
    print(f'Done: {done} chapters.')


if __name__ == '__main__':
    if len(sys.argv) not in (2, 3) or (len(sys.argv) == 3 and sys.argv[2] not in ENGINES):
        raise SystemExit('Usage: import_audio.py <folder with 12.mp3, 13.mp3 ...> [chatterbox|mms]')
    main(*sys.argv[1:])
