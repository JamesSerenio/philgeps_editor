"""Create R&L applicant-controlled templates without changing existing company assets.
Run with PyMuPDF: python scripts/create-r-and-l-templates.py --tessdata <folder>
"""
import argparse
import importlib.util
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('conversion', ROOT / 'scripts/create-manotech-templates.py')
conversion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(conversion)
conversion.TARGET_NAME = 'R&L BUILDERS AND CONSTRUCTION SUPPLY'
conversion.ADDRESS = 'Brgy. Baloy Extension, Gusa, Cagayan de Oro City, Misamis Oriental, Philippines'
conversion.LOGO = ROOT / 'public/images/R_AND_L_BUILDERS/R&L Builders Construction Supply Logo.png'
DEST = ROOT / 'public/pdf/templates/R_AND_L_BUILDERS'

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--tessdata', required=True)
    parser.add_argument('--verify-existing', action='store_true')
    args = parser.parse_args()
    audit = []
    for source in sorted(conversion.SOURCE.rglob('*.pdf')):
        relative = source.relative_to(conversion.SOURCE)
        target = DEST / relative.parent / source.name.replace('MIKATA CORPORATION - ', conversion.TARGET_NAME + ' - ', 1)
        if target.exists():
            if not args.verify_existing: raise FileExistsError('Refusing to overwrite ' + str(target))
            original, output = conversion.fitz.open(source), conversion.fitz.open(target)
            assert len(original) == len(output)
            assert all(a.rect == b.rect for a, b in zip(original, output))
            audit.append({'source': source.relative_to(ROOT).as_posix(), 'output': target.relative_to(ROOT).as_posix(),
                          'sourceSha256': conversion.sha(source), 'sha256': conversion.sha(target), 'pages': len(output)})
        else:
            audit.append(conversion.convert(source, target, args.tessdata))
    (ROOT / 'docs/r-and-l-template-conversion.json').write_text(json.dumps(audit, indent=2) + '\n', encoding='utf8')
    print('Created', len(audit), 'R&L forms. All existing templates and official certificates untouched.')
