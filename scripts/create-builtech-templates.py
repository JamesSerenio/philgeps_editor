"""Create applicant-controlled Builtech templates; never touch official/static PDFs.
Run: uv run --with pymupdf python scripts/create-builtech-templates.py --tessdata <English OCR data folder>
Existing destination files are never overwritten.
"""
import argparse, hashlib, json, pathlib, re
import pymupdf as fitz
ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/pdf/templates/MIKATA_CORPORATION'
DEST = ROOT / 'public/pdf/templates/BUILTECH_SOLUTIONS'
LOGO = ROOT / 'public/images/BUILTECH_SOLUTIONS/BUILTECH_SOLUTIONS-logo.png'
ADDRESS = 'M. Vega St., Abarlos Compound, Consolacion, Cagayan de Oro City'
HEADER_ADDRESS = 'M. Vega St., Abalos Comp., Consolacion, Cagayan de Oro City'
ILIGAN = 'Jamille St., Maria Cristina Subd., Brgy. San Miguel, Iligan City'
CONTACT = 'Mobile No.: 0917 772 7893 / 0916 107 9932  Email: Builtechcorporation@gmail.com'
COMPANY = re.compile(r'(?:MIKATA\s*)+(?:PRIME\s*)*(?:CORPORATION\s*)+', re.I)
PEOPLE = re.compile(r'JHO\s+ANN\s+Q[.,]?\s*CLEOPAS|CARLOS\s+RAFAEL\s+A[.]?\s*JAMILO|MARLJONE\s+BLAIRE\s+B[.]?\s*TINGTING|ALYSSA\s+LYNN\s+TALINGTING|PATRICK\s+CARLO\s+P[.]?\s*DEDEL', re.I)
HEADERS = {
 'After Sales.pdf': ((24,22,600,114),(27.25,26.25,134.02,109.73),142,56,71),
 'Warranty.pdf': ((24,22,600,114),(25.5,22.65,135.74,106.1),144,53.5,68.1),
 'Manpower Requirements.pdf': ((30,56,600,156),(36.25,64,143.02,147.48),151,96,110),
 'TABBING.pdf': ((34,22,580,114),(43.45,25.8,147.64,112.75),152.47,55.7,75.62),
}

def font_for(span):
 name = span.get('font','').lower()
 bold = 'bold' in name or bool(span.get('flags',0)&16)
 italic = 'italic' in name or 'oblique' in name or bool(span.get('flags',0)&2)
 if 'arial' in name or 'helvetica' in name: return 'hebi' if bold and italic else 'hebo' if bold else 'heit' if italic else 'helv'
 return 'tibi' if bold and italic else 'tibo' if bold else 'tiit' if italic else 'tiro'

def insert(page, rect, text, span):
 text = text.strip()
 if not text: return
 size = min(span.get('size',11),rect.height*.85)
 font = font_for(span)
 # A replacement uses the original baseline and fits within its original line.
 width=max(rect.width, min(150,page.rect.width-rect.x0-20))
 while size>5 and fitz.get_text_length(text,fontname=font,fontsize=size)>width: size-=.2
 color=fitz.sRGB_to_pdf(span.get('color',0))
 baseline=min(rect.y1-2,span.get('origin',(rect.x0,rect.y1-2))[1])
 page.insert_text((rect.x0,baseline),text,fontname=font,fontsize=size,color=color)

def convert(source,dest,tessdata):
 doc=fitz.open(source)
 name=source.name.removeprefix('MIKATA CORPORATION - ')
 raster=False
 for page in doc:
  raw=page.get_text().strip()
  tp=None
  if not raw:
   tp=page.get_textpage_ocr(tessdata=tessdata,dpi=200)
   raster=True
  blocks=page.get_text('dict',textpage=tp)['blocks']
  header=HEADERS.get(name)
  replacements=[]
  redactions=[]
  if header: redactions.append(fitz.Rect(header[0]))
  # Historical financial amounts and staff identities are not Builtech data.
  if name=='NFCC_Template.pdf': redactions.append(fitz.Rect(390,416,536,574))
  if name=='Manpower Requirements.pdf': redactions.append(fitz.Rect(135,310,541,450))
  if name=='SLCC_table_cctv.pdf': redactions.append(fitz.Rect(150,225,807,370))
  if name=='SLCC_table_streetlight.pdf': redactions.append(fitz.Rect(170,265,817,365))
  for block in blocks:
   for line in block.get('lines',[]):
    spans=line['spans']
    if tp and spans:
     spans=[dict(spans[0],text=' '.join(s['text'] for s in spans),bbox=line['bbox'])]
    for span in spans:
     text=span['text']; rect=fitz.Rect(span['bbox'])
     if any(r.intersects(rect) for r in redactions): continue
     updated=COMPANY.sub('BUILTECH SOLUTIONS ',text)
     updated=PEOPLE.sub('________________',updated)
     if re.search(r'MikataPrime@|0917\s*129|0926\s*253',updated,re.I): updated=''
     if re.search(r'L-?25|San Agustin|SITIO PULI|ZONE\s+13|LOT 27 BLOCK|HOMES CARMEN|Address:\s*Carmen',updated,re.I):
      updated=('Office: ' if 'office' in updated.lower() else 'Address: ' if 'Address:' in updated else '')+ADDRESS
     if re.search(r'Tankulan|Manolo Fortich|Camaman.an',updated,re.I): updated='________________'
     if updated!=text:
      redactions.append(rect)
      replacements.append((rect,updated,span))
  for rect in redactions: page.add_redact_annot(rect,fill=(1,1,1))
  # Text is removed from content streams; scanned pixels and logo images are
  # removed in their redacted regions. Borders and other vector lines stay.
  page.apply_redactions(images=2,graphics=0,text=0)
  for rect,text,span in replacements: insert(page,rect,text,span)
  if header:
   _,logo,x,title_y,address_y=header
   left,top=logo[0],logo[1]
   page.insert_image(fitz.Rect(left,top,left+170,top+72),filename=str(LOGO),keep_proportion=True)
   registration='PCAB Registered No. 46156'
   reg_width=fitz.get_text_length(registration,fontname='hebi',fontsize=8.5)
   page.insert_text((left+(170-reg_width)/2,top+82),registration,fontname='hebi',fontsize=8.5)
   x=left+180
   for offset,text in [(42,'CDO Office: '+HEADER_ADDRESS),(57,'Iligan Office: '+ILIGAN),(72,CONTACT)]:
    size=9
    while fitz.get_text_length(text,fontname='hebi',fontsize=size)>page.rect.width-x-24: size-=.25
    page.insert_text((x,top+offset),text,fontname='hebi',fontsize=size)
 # Catch broken/duplicated original words in the already-overlaid Initao source.
 for page in doc:
  for variant in ['MIKATA PRIME CORPORATION','Mikata Prime Corporation','MIKATA CORPORATION','MIKATA']:
   for rect in page.search_for(variant): page.add_redact_annot(rect,fill=(1,1,1))
  page.apply_redactions(images=0,graphics=0,text=0)
 doc.set_metadata({'title':'BUILTECH SOLUTIONS - '+name,'author':'BUILTECH SOLUTIONS'})
 dest.parent.mkdir(parents=True,exist_ok=True)
 doc.save(dest,garbage=4,deflate=True,clean=True)
 check=fitz.open(dest)
 assert len(check)==len(doc)
 for i,p in enumerate(check):
  assert p.rect==doc[i].rect
  assert not re.search('mikata|cleopas|jamilo|tingting|dedel|alesna|hablos',p.get_text(),re.I),(dest,p.number)
 return {'source':source.relative_to(ROOT).as_posix(),'output':dest.relative_to(ROOT).as_posix(), 'pages':len(doc),'ocr':raster,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--tessdata',required=True);args=parser.parse_args()
 results=[]
 for source in sorted(SOURCE.rglob('*.pdf')):
  relative=source.relative_to(SOURCE)
  dest=DEST/relative.parent/source.name.replace('MIKATA CORPORATION - ','BUILTECH SOLUTIONS - ',1)
  if dest.exists(): raise FileExistsError('Refusing to overwrite '+str(dest))
  results.append(convert(source,dest,args.tessdata))
 (ROOT/'docs/builtech-template-conversion.json').write_text(json.dumps(results,indent=2),encoding='utf8')
 print('Created',len(results),'Builtech template PDFs. Mikata originals and all static certificates unchanged.')
