"""Create separate applicant-controlled Manotech forms, never official certificates.

Run with PyMuPDF installed:
  python scripts/create-manotech-templates.py --tessdata <folder with eng.traineddata>
Existing outputs are verified rather than overwritten. Source hashes are recorded.
"""
import argparse
import hashlib
import json
import pathlib
import re
import pymupdf as fitz

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/pdf/templates/MIKATA_CORPORATION'
DEST = ROOT / 'public/pdf/templates/MANOTECH'
LOGO = ROOT / 'public/images/MANOTECH/MANOTECH-logo.png'
ADDRESS = 'Purok 4, Poblacion, Linamon, Lanao del Norte'
TARGET_NAME = 'MANOTECH'
COMPANY = re.compile(r'(?:MIKATA\s*)+(?:PRIME\s*)*(?:CORPORATION\s*)*', re.I)
PERSON = re.compile(r'(?:JHO\s+ANN\s+Q[.,]?\s*CLEOPAS|CARLOS\s+RAFAEL\s+A[.]?\s*JAMILO|MARLJONE\s+BLAIRE\s+B[.]?\s*TINGTING|ALYSSA\s+LYNN\s+TALINGTING|PATRICK\s+CARLO\s+P[.]?\s*DEDEL)', re.I)
PRIVATE = re.compile(r'cleopas|jamilo|tingting|dedel|alesna|hablos|talingting|MikataPrime@|0917\s*129|0926\s*253|Tankulan|Manolo Fortich|Camaman.an', re.I)
OLD_ADDRESS = re.compile(r'L-?25|San Agustin|SITIO PULI|ZONE\s*13|LOT\s*27|HOMES CARMEN|Address:\s*Carmen|CDO Office:', re.I)
HEADERS = {
    'After Sales.pdf': (24, 22, 600, 114, 27.25, 26.25, 134.02, 109.73, 142, 56, 71),
    'Warranty.pdf': (24, 22, 600, 114, 25.5, 22.65, 135.74, 106.1, 144, 53.5, 68.1),
    'Manpower Requirements.pdf': (30, 56, 600, 156, 36.25, 64, 143.02, 147.48, 151, 96, 110),
    'TABBING.pdf': (34, 22, 580, 114, 43.45, 25.8, 147.64, 112.75, 152.47, 55.7, 75.62),
}

def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def font_for(span):
    name = span.get('font', '').lower()
    bold = 'bold' in name or bool(span.get('flags', 0) & 16)
    italic = 'italic' in name or 'oblique' in name or bool(span.get('flags', 0) & 2)
    if 'arial' in name or 'helvetica' in name:
        return 'hebi' if bold and italic else 'hebo' if bold else 'heit' if italic else 'helv'
    return 'tibi' if bold and italic else 'tibo' if bold else 'tiit' if italic else 'tiro'

def insert(page, rect, value, span):
    if not value.strip():
        return
    font = font_for(span)
    size = span.get('size', 11)
    width = min(page.rect.width - rect.x0 - 20, max(rect.width, 90))
    while size > 5 and fitz.get_text_length(value, fontname=font, fontsize=size) > width:
        size -= .1
    page.insert_text((rect.x0, span.get('origin', (0, rect.y1 - 2))[1]), value,
                     fontname=font, fontsize=size, color=fitz.sRGB_to_pdf(span.get('color', 0)))

def convert(source, dest, tessdata):
    doc = fitz.open(source)
    name = source.name.removeprefix('MIKATA CORPORATION - ')
    ocr = False
    for page in doc:
        tp = None
        if not page.get_text().strip():
            tp = page.get_textpage_ocr(tessdata=tessdata, dpi=200)
            ocr = True
        header = HEADERS.get(name)
        redactions, replacements = [], []
        if header:
            redactions.append(fitz.Rect(header[:4]))
        # Clear only applicant-controlled history/staff cells, retaining vectors.
        if name == 'NFCC_Template.pdf': redactions.append(fitz.Rect(390, 416, 536, 574))
        if name == 'Manpower Requirements.pdf': redactions.append(fitz.Rect(135, 310, 541, 450))
        if name.startswith('SLCC_table_'): redactions.append(fitz.Rect(139, 220, page.rect.width - 20, 395))
        for block in page.get_text('dict', textpage=tp)['blocks']:
            for line in block.get('lines', []):
                for span in line['spans']:
                    value, rect = span['text'], fitz.Rect(span['bbox'])
                    if any(r.intersects(rect) for r in redactions): continue
                    updated = COMPANY.sub(TARGET_NAME + ' ', value)
                    updated = PERSON.sub('________________', updated)
                    if PRIVATE.search(updated): updated = '________________'
                    if OLD_ADDRESS.search(updated):
                        updated = ('Office: ' if 'Office:' in updated else '') + ADDRESS
                    if updated != value:
                        redactions.append(rect)
                        replacements.append((rect, updated, span))
        for rect in redactions: page.add_redact_annot(rect, fill=False)
        page.apply_redactions(images=2, graphics=0, text=0)
        for rect, value, span in replacements: insert(page, rect, value, span)
        if header:
            page.insert_image(fitz.Rect(header[4:8]), filename=str(LOGO), keep_proportion=True)
            insert(page, fitz.Rect(header[8], header[9] - 24, page.rect.width - 24, header[9] + 2), TARGET_NAME,
                   {'font': 'Times-Bold', 'size': 22, 'origin': (header[8], header[9])})
            page.insert_text((header[8], header[10]), 'Office: ' + ADDRESS, fontname='hebi', fontsize=9)
        # Remove broken fragments already present in the Initao source overlay.
        for pattern in ['MIKATA', 'CLEOPAS', 'TANKULAN', 'CARMEN', 'SAN AGUSTIN', 'MikataPrime@gmail.com']:
            for rect in page.search_for(pattern): page.add_redact_annot(rect, fill=False)
        page.apply_redactions(images=2 if tp else 0, graphics=0, text=0)
    doc.set_metadata({'title': TARGET_NAME + ' - ' + name, 'author': TARGET_NAME})
    dest.parent.mkdir(parents=True, exist_ok=True)
    doc.save(dest, garbage=4, deflate=True, clean=True)
    check = fitz.open(dest)
    assert len(check) == len(doc)
    assert all(a.rect == b.rect for a, b in zip(doc, check))
    assert not re.search(r'mikata|cleopas|jamilo|tingting|dedel|alesna|hablos|talingting', '\n'.join(p.get_text() for p in check), re.I), dest
    return {'source': source.relative_to(ROOT).as_posix(), 'output': dest.relative_to(ROOT).as_posix(),
            'sourceSha256': sha(source), 'sha256': sha(dest), 'pages': len(doc), 'ocr': ocr}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--tessdata', required=True)
    parser.add_argument('--verify-existing', action='store_true')
    args = parser.parse_args()
    outputs = []
    for source in sorted(SOURCE.rglob('*.pdf')):
        relative = source.relative_to(SOURCE)
        dest = DEST / relative.parent / source.name.replace('MIKATA CORPORATION - ', 'MANOTECH - ', 1)
        if dest.exists():
            if not args.verify_existing: raise FileExistsError('Refusing to overwrite ' + str(dest))
            original, converted = fitz.open(source), fitz.open(dest)
            assert len(original) == len(converted)
            assert all(a.rect == b.rect for a, b in zip(original, converted))
            outputs.append({'source': source.relative_to(ROOT).as_posix(), 'output': dest.relative_to(ROOT).as_posix(),
                            'sourceSha256': sha(source), 'sha256': sha(dest), 'pages': len(converted),
                            'ocr': not any(p.get_text().strip() for p in original)})
        else:
            outputs.append(convert(source, dest, args.tessdata))
    (ROOT / 'docs/manotech-template-conversion.json').write_text(json.dumps(outputs, indent=2) + '\n', encoding='utf8')
    print('Created', len(outputs), 'independent Manotech forms; original and official PDFs untouched.')
