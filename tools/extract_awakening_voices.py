"""Import the supplied awakening ZIP's original Opus bytes, verifying declared hashes."""
import argparse,hashlib,json,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('archive',type=Path);args=p.parse_args()
with zipfile.ZipFile(args.archive) as z:
 source=json.loads(z.read('manifest.json'));records=[]
 assert {e['language'] for e in source['entries']}=={'es','en'} and len(source['entries'])==2
 for e in source['entries']:
  assert e['id']=='spirit.awakening.'+e['language']
  data=z.read('audio/'+e['filename']);digest=hashlib.sha256(data).hexdigest();assert digest==e['sha256']
  path='content/spirit-voices/awakening/'+e['id']+'.opus'
  target=root/'public'/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
  records.append(dict(id=e['id'],messageId='magic.awakening',language=e['language'],text=e['text'],path=path,bytes=len(data),sha256=digest,codec='Opus',channels=2,sampleRate=48000,labDurationSeconds=e['duration_seconds']))
manifest=dict(source=args.archive.name,sourceSha256=hashlib.sha256(args.archive.read_bytes()).hexdigest(),recipe='Original supplied V9 Opus bytes, verified SHA256; no transcoding',records=records)
(root/'content/manifests/awakening-spirit-voices.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Imported',len(records),'original recordings')
