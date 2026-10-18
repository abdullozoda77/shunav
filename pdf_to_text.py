"""Text out of the Tajik book PDFs from kitobkhon.net (the ones that have real text, not only page pictures).

    python pdf_to_text.py <book.pdf> <out.txt>

Some of these PDFs were typed with an old Tajik font that put Tajik letters on other Cyrillic codes
(ї = ӣ, њ = ҳ, ќ = қ, ў = ӯ, љ = ҷ, ѓ = ғ); they are turned back into real Tajik letters.
Every page is written as "=== page N ===" and its text, so the book can be cut into chapters afterwards.
Needs: pip install pypdf
"""
import sys

from pypdf import PdfReader

OLD_FONT = str.maketrans({
    'ї': 'ӣ', 'Ї': 'Ӣ', 'њ': 'ҳ', 'Њ': 'Ҳ', 'ќ': 'қ', 'Ќ': 'Қ',
    'ў': 'ӯ', 'Ў': 'Ӯ', 'љ': 'ҷ', 'Љ': 'Ҷ', 'ѓ': 'ғ', 'Ѓ': 'Ғ',
})


def main(source, target):
    reader = PdfReader(source)
    with open(target, 'w', encoding='utf-8') as out:
        for number, page in enumerate(reader.pages, 1):
            text = (page.extract_text() or '').translate(OLD_FONT)
            out.write(f'=== page {number} ===\n{text.strip()}\n\n')
    print(f'{target}: {len(reader.pages)} pages')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
