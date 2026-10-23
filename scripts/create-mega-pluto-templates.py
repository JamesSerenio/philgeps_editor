"""Create independent applicant-controlled Mega Pluto forms; never official certificates."""
import argparse
import importlib.util
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('conversion', ROOT / 'scripts/create-manotech-templates.py')
conversion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(conversion)
conversion.TARGET_NAME = 'MEGA PLUTO'
conversion.ADDRESS = 'Kihare, Bukidnon, 8703'
conversion.LOGO = ROOT / 'public/images/MEGA_PLUTO/MEGA_PLUTO-logo.png'
DEST = ROOT / 'public/pdf/templates/MEGA_PLUTO'

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--tessdata', required=True)
    parser.add_argument('--verify-existing', action='store_true')
    args = parser.parse_args()
    audit = []
    for source in sorted(conversion.SOURCE.rglob('*.pdf')):
        relative = source.relative_to(conversion.SOURCE)
        target = DEST / relative.parent / source.name.replace('MIKATA CORPORATION - ', 'MEGA PLUTO - ', 1)
        if target.exists():
            if not args.verify_existing:
                raise FileExistsError('Refusing to overwrite ' + str(target))
            original, output = conversion.fitz.open(source), conversion.fitz.open(target)
            assert len(original) == len(output)
            assert all(a.rect == b.rect for a, b in zip(original, output))
            audit.append({'source': source.relative_to(ROOT).as_posix(), 'output': target.relative_to(ROOT).as_posix(),
                          'sourceSha256': conversion.sha(source), 'sha256': conversion.sha(target), 'pages': len(output)})
        else:
            audit.append(conversion.convert(source, target, args.tessdata))
    (ROOT / 'docs/mega-pluto-template-conversion.json').write_text(json.dumps(audit, indent=2) + '\n', encoding='utf8')
    print('Verified', len(audit), 'independent MEGA PLUTO forms. Existing company assets unchanged.')
