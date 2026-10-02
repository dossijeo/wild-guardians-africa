"""Inventory static presentation and JavaScript literals for localization review."""
import re, json, html
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
inventory={}
class Text(HTMLParser):
 def __init__(self,path): super().__init__();self.path=path;self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ['script','style','code','pre']:self.skip+=1
  if not self.skip:
   for key,value in attrs:
    if key in ['title','alt','placeholder','aria-label','aria-description'] and value:add(value,self.path)
 def handle_endtag(self,tag):
  if tag in ['script','style','code','pre']:self.skip=max(0,self.skip-1)
 def handle_data(self,value):
  if not self.skip:add(value,self.path)
def add(value,path):
 value=html.unescape(re.sub(r'\s+',' ',value)).strip()
 if not value or len(value)>2000 or not re.search('[A-Za-zÁÉÍÓÚáéíóúñÑ]',value):return
 if re.search(r'[{}<>]|\b(?:const|function|return|uniform|vec[234]|let)\b|https?://|/assets/|\$|\\|[=]',value):return
 if value.startswith(('/', '#')) or re.search(r'^[a-z]+(?:[-_:][a-z]+)+$',value):return
 inventory.setdefault(value,set()).add(str(path))
for row in json.loads((ROOT/'.cache/i18n-literals.json').read_text(encoding='utf8')):
 value=row['value'];path=row['file'].replace('\\','/')
 if '<' in value and '>' in value:Text(path).feed(value)
 else:add(value,path)
for path in [ROOT/'index.html',*ROOT.glob('public/menu/*.html'),*ROOT.glob('public/selector/*.html'),ROOT/'public/library.html',*ROOT.glob('public/library/**/*.html')]:
 Text(path.relative_to(ROOT).as_posix()).feed(path.read_text(encoding='utf8'))
for entries in json.loads((ROOT/'public/content/selector.json').read_text(encoding='utf8')).values():
 for entry in entries:
  for key in ['name','tag','description','alt']:add(entry[key],'public/content/selector.json')
target=ROOT/'docs/i18n-inventory.json'
target.write_text(json.dumps({k:sorted(v) for k,v in sorted(inventory.items())},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'{len(inventory)} presentation candidates -> {target}')
