"""Audio for the chapters: the text is read aloud by an AI voice in Tajik.

The voice is Meta's MMS-TTS for Tajik (facebook/mms-tts-tgk), trained on recordings of native Tajik speakers.
It knows every Tajik letter (ғ қ ҳ ҷ ӣ ӯ), but not punctuation or digits, so before reading:
  - numbers are written out in Tajik words (122 -> яксаду бисту ду),
  - punctuation, line ends and empty lines become pauses of different length (comma < line < stanza),
  - "ѐ" (a typo in some source texts) becomes "ё", broken characters are dropped.
Each chapter becomes one MP3 in media/audio/, and the chapter is marked "done" with its real duration.
The license of the voice is CC BY-NC 4.0: fine for this project, but not for selling.

    .venv\\Scripts\\python generate_audio.py              # every chapter without audio
    .venv\\Scripts\\python generate_audio.py Рубоиёт      # only these books (titles)
    .venv\\Scripts\\python generate_audio.py --test       # first 40 lines of Рубоиёт -> media/audio/test.mp3

The first run downloads the voice (~150 MB). Needs: .venv\\Scripts\\pip install -r requirements-import.txt
"""
import os
import re
import sys
import time
import uuid

import lameenc
import numpy as np
import torch
from transformers import AutoTokenizer, VitsModel

from config import MEDIA_DIR
from database import SessionLocal
from models import Book, Chapter, Narrator

MODEL = 'facebook/mms-tts-tgk'
SPEAKING_RATE = 0.75          # slower than normal: a calm reading, every word clear
NOISE_SCALE = 0.33            # little "randomness" in the voice -> the same steady voice (default 0.667)
NOISE_SCALE_DURATION = 0.4    # steady rhythm (default 0.8)
VOICE_SEED = 7                # the same seed before every piece = the same voice in every sentence
LOUDNESS = 0.08               # every piece is brought to this loudness (RMS), so none sounds louder
MP3_KBPS = 48

# pauses in seconds
PAUSE_COMMA = 0.25
PAUSE_LINE = 0.45
PAUSE_SENTENCE = 0.6
PAUSE_STANZA = 0.9
PAUSE_SECTION = 1.4   # before "◆ Шумораи ..." and after the chapter title

ONES = ['', 'як', 'ду', 'се', 'чор', 'панҷ', 'шаш', 'ҳафт', 'ҳашт', 'нӯҳ']
TEENS = ['даҳ', 'ёздаҳ', 'дувоздаҳ', 'сенздаҳ', 'чордаҳ', 'понздаҳ', 'шонздаҳ', 'ҳабдаҳ', 'ҳаждаҳ', 'нуздаҳ']
TENS = ['', '', 'бист', 'сӣ', 'чил', 'панҷоҳ', 'шаст', 'ҳафтод', 'ҳаштод', 'навад']
VOWELS = set('аеёиоуэюяӣӯ')


def join_with_u(words: list[str]) -> str:
    """Tajik joins the parts of a number with -у (after a consonant) or -ю (after a vowel): бисту ду, сию се."""
    result = ''
    for i, word in enumerate(words):
        if i < len(words) - 1:
            word += 'ю' if word[-1] in VOWELS else 'у'
            if word.endswith('ӣю'):
                word = word[:-2] + 'ию'
            result += word + ' '
        else:
            result += word
    return result


def number_to_words(n: int) -> str:
    if n == 0:
        return 'сифр'
    words = []
    if n >= 1000:
        thousands = n // 1000
        words.append('ҳазор' if thousands == 1 else number_to_words(thousands) + ' ҳазор')
        n %= 1000
    if n >= 100:
        words.append(ONES[n // 100] + 'сад')
        n %= 100
    if n >= 20:
        words.append(TENS[n // 10])
        n %= 10
    elif n >= 10:
        words.append(TEENS[n - 10])
        n = 0
    if n:
        words.append(ONES[n])
    return join_with_u(words)


def clean(text: str) -> str:
    """Only what the voice can read: lowercase Tajik letters and spaces."""
    text = text.lower().replace('ѐ', 'ё').replace('�', '')
    text = re.sub(r'\d+', lambda m: ' ' + number_to_words(int(m.group())) + ' ', text)
    text = re.sub(r'(?<=\w)[-‐](?=\w)', '', text)      # з-оҳан -> зоҳан
    text = re.sub(r'[^а-яёғқҳҷӣӯъ ]', ' ', text)
    return re.sub(r' +', ' ', text).strip()


def split_into_pieces(title: str, text: str) -> list[tuple[str, float]]:
    """The chapter as (words to read, pause after them) pieces."""
    pieces = [(clean(title), PAUSE_SECTION)]
    for stanza in re.split(r'\n\s*\n', text.strip()):
        lines = [line for line in stanza.split('\n') if clean(line)]
        for i, line in enumerate(lines):
            if line.lstrip().startswith('◆'):   # a new poem: longer pause before it
                pieces[-1] = (pieces[-1][0], max(pieces[-1][1], PAUSE_SECTION))
            parts = re.split(r'([,;:.!?…–—«»()“”])', line) + ['']
            chunks = [(clean(parts[j]), parts[j + 1]) for j in range(0, len(parts) - 1, 2)]
            chunks = [(words, mark) for words, mark in chunks if words]
            for j, (words, mark) in enumerate(chunks):
                pause = PAUSE_SENTENCE if mark and mark in '.!?…' else PAUSE_COMMA
                if j == len(chunks) - 1:   # end of the line / of the stanza
                    pause = max(pause, PAUSE_STANZA if i == len(lines) - 1 else PAUSE_LINE)
                pieces.append((words, pause))
    return pieces


class Voice:
    def __init__(self):
        print(f'Loading {MODEL} ...')
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL)
        self.model = VitsModel.from_pretrained(MODEL)
        self.model.speaking_rate = SPEAKING_RATE
        self.model.noise_scale = NOISE_SCALE
        self.model.noise_scale_duration = NOISE_SCALE_DURATION
        self.rate = self.model.config.sampling_rate
        torch.manual_seed(7)
        torch.set_num_threads(os.cpu_count() or 1)   # torch uses only half the cores by default

    def say(self, words: str) -> np.ndarray:
        inputs = self.tokenizer(words, return_tensors='pt')
        torch.manual_seed(VOICE_SEED)
        with torch.no_grad():
            wav = self.model(**inputs).waveform[0].numpy()
        rms = np.sqrt(np.mean(wav ** 2)) if len(wav) else 0
        return wav * (LOUDNESS / rms) if rms > 1e-4 else wav

    def read(self, pieces: list[tuple[str, float]]) -> np.ndarray:
        sound = []
        for words, pause in pieces:
            sound.append(self.say(words))
            sound.append(np.zeros(int(pause * self.rate), dtype=np.float32))
        audio = np.concatenate(sound)
        return np.clip(audio / max(np.abs(audio).max(), 1e-6) * 0.9, -1, 1)   # same loudness in every chapter

    def save_mp3(self, audio: np.ndarray, path: str):
        encoder = lameenc.Encoder()
        encoder.set_bit_rate(MP3_KBPS)
        encoder.set_in_sample_rate(self.rate)
        encoder.set_channels(1)
        encoder.set_quality(2)
        data = encoder.encode((audio * 32767).astype(np.int16).tobytes()) + encoder.flush()
        with open(path, 'wb') as out:
            out.write(data)


def test():
    db = SessionLocal()
    chapter = db.query(Chapter).join(Book).filter(Book.title == 'Рубоиёт').order_by(Chapter.order).first()
    text = '\n'.join(chapter.text.split('\n')[:40])
    voice = Voice()
    audio = voice.read(split_into_pieces(chapter.title, text))
    os.makedirs(f'{MEDIA_DIR}/audio', exist_ok=True)
    voice.save_mp3(audio, f'{MEDIA_DIR}/audio/test.mp3')
    print(f'{MEDIA_DIR}/audio/test.mp3 ({len(audio) / voice.rate:.0f} s)')


def main(titles: list[str]):
    db = SessionLocal()
    query = db.query(Chapter).join(Book).filter(Chapter.audio_status != 'done', Chapter.text.isnot(None))
    if titles:
        query = query.filter(Book.title.in_(titles))
    chapters = query.order_by(Book.id, Chapter.order).all()
    if not chapters:
        print('Every chapter already has audio.')
        return

    narrator = db.query(Narrator).filter(Narrator.tts_model == MODEL).first()
    if narrator is None:
        narrator = Narrator(name='Овози AI (тоҷикӣ)', kind='ai', tts_model=MODEL)
        db.add(narrator)

    voice = Voice()
    os.makedirs(f'{MEDIA_DIR}/audio', exist_ok=True)
    for number, chapter in enumerate(chapters, 1):
        print(f'[{number}/{len(chapters)}] {chapter.book.title} — {chapter.title} ...', end=' ', flush=True)
        started = time.time()
        chapter.audio_status = 'processing'
        db.commit()
        try:
            audio = voice.read(split_into_pieces(chapter.title, chapter.text))
            path = f'{MEDIA_DIR}/audio/{uuid.uuid4().hex}.mp3'
            voice.save_mp3(audio, path)
        except Exception as error:
            chapter.audio_status = 'failed'
            db.commit()
            print(f'failed: {error}')
            continue
        if chapter.audio_file and os.path.exists(chapter.audio_file.lstrip('/')):
            os.remove(chapter.audio_file.lstrip('/'))
        chapter.audio_file = '/' + path
        chapter.duration_seconds = round(len(audio) / voice.rate)
        chapter.audio_status = 'done'
        if chapter.book.narrator is None:
            chapter.book.narrator = narrator
        db.commit()
        print(f'{chapter.duration_seconds // 60} min audio in {time.time() - started:.0f} s')
    print('Done.')


if __name__ == '__main__':
    if '--test' in sys.argv:
        test()
    else:
        main(sys.argv[1:])
