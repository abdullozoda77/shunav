"""Put back the Tajik letters that a scan's text layer lost (old fonts had no ҳ қ ҷ ӣ ӯ ғ).

In such texts ҳ became "х", "Х," or "хд", ҷ became "ч" or "Ч,", ӣ became "й", and some letters are Latin look-alikes
("cap" with a Latin c). For every word, all spellings that these mistakes could hide are tried, and the one that is
most common in the clean books (data/texts/raw) wins. A word that is in none of them gets two safe rules only
(ӣ at the end after a consonant). Used by import_texts.py:

    from tajik_restore import Restorer
    text = Restorer().text(ocr_text)
"""
import collections
import math
import itertools
import os
import re

RAW = 'data/texts/raw'
CLEAN_BOOKS = ['buston', 'hofiz', 'masnavi', 'masnavi2', 'masnavi3', 'masnavi4', 'masnavi5', 'masnavi6', 'ruboiyot',
               'rudaki', 'shohnoma', 'odina', 'yoddoshtho4']

# marks the scan left after a letter that had a hook or a tail
MARKED = [('Х,', 'Ҳ'), ('х,', 'ҳ'), ('Ч,', 'Ҷ'), ('ч,', 'ҷ'), ('К,', 'Қ'), ('к,', 'қ'), ('Г,', 'Ғ'), ('г,', 'ғ'),
          ('Х^', 'Ҳ'), ('х^', 'ҳ'), ('Ч^', 'Ҷ'), ('ч^', 'ҷ'), ('К^', 'Қ'), ('к^', 'қ'), ('У^', 'Ӯ'), ('у^', 'ӯ')]
LATIN = str.maketrans('aceopxyAEOPCXHKMTB', 'асеорхуАЕОРСХНКМТВ')
# letter in the scan -> what it may really be
MAYBE = {'х': 'хҳ', 'к': 'кқ', 'ч': 'чҷ', 'й': 'йӣ', 'у': 'уӯ', 'г': 'гғ', 'и': 'иӣ'}
VOWELS = set('аеёиоуэюяӣӯ')
WORD = re.compile(r'[А-Яа-яЁёӢӣӮӯҲҳҚқҒғҶҷ]+')


N = 4  # letters of context for words that are in none of the clean books


class Restorer:
    def __init__(self, books=CLEAN_BOOKS):
        self.counts = collections.Counter()
        for name in books:
            path = f'{RAW}/{name}.txt'
            if os.path.exists(path):
                self.counts.update(w.lower() for w in WORD.findall(open(path, encoding='utf-8').read()))
        # how often each group of N letters comes inside words ("^ҳок", "оким", ...): for words never seen whole
        self.grams, self.contexts = collections.Counter(), collections.Counter()
        for word, count in self.counts.items():
            padded = '^' * (N - 1) + word + '$'
            for i in range(N - 1, len(padded)):
                self.grams[padded[i - N + 1:i + 1]] += count
                self.contexts[padded[i - N + 1:i]] += count
        self.cache = {}

    def score(self, word):
        """How Tajik-looking a spelling is: the log probability of each letter after the N-1 letters before it."""
        padded = '^' * (N - 1) + word + '$'
        return sum(math.log((self.grams[padded[i - N + 1:i + 1]] + 0.1) / (self.contexts[padded[i - N + 1:i]] + 4))
                   for i in range(N - 1, len(padded)))

    def spellings(self, lower):
        spots = [(i, MAYBE[c]) for i, c in enumerate(lower) if c in MAYBE][:12]
        for choice in itertools.product(*(options for _, options in spots)):
            letters = list(lower)
            for (i, _), letter in zip(spots, choice):
                letters[i] = letter
            yield ''.join(letters)

    def best(self, lower):
        if lower in self.cache:
            return self.cache[lower]
        # "хд" / "кд" may be the scan's way of writing ҳ / қ, or real letters (нақд): both are tried
        forms = {lower, lower.replace('хд', 'ҳ').replace('кд', 'қ')}
        candidates = [c for form in forms for c in self.spellings(form)]
        known = [c for c in candidates if c in self.counts]
        # a word the books have: its most common spelling; otherwise the most Tajik-looking one
        result = max(known, key=self.counts.get) if known else max(candidates, key=self.score)
        self.cache[lower] = result
        return result

    def word(self, word):
        best = self.best(word.lower())
        # the case of the original word
        return ''.join(new.upper() if old.isupper() else new for old, new in zip(word.ljust(len(best)), best))

    def text(self, text):
        for old, new in MARKED:
            text = text.replace(old, new)
        text = re.sub(r'(?<=[А-Яа-яЁёӢӣӮӯҲҳҚқҒғҶҷ])[\^\'"`~]+|[\^\'"`~]+(?=[А-Яа-яЁёӢӣӮӯҲҳҚқҒғҶҷ])', '', text)
        # Latin look-alikes inside Cyrillic words ("cap")
        text = re.sub(r'\b[a-zA-Zа-яА-ЯёЁӣӯҳқғҷӢӮҲҚҒҶ]+\b',
                      lambda m: m.group().translate(LATIN) if re.search('[а-яА-Я]', m.group()) or len(m.group()) <= 4 and re.fullmatch('[aceopxyAEOPCXHKMTB]+', m.group()) else m.group(), text)
        return WORD.sub(lambda m: self.word(m.group()), text)
