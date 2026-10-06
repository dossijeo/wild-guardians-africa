"""Extract the supplied V9 lab without re-encoding or printing embedded media."""
import argparse,base64,hashlib,json,re,struct
from pathlib import Path

parser=argparse.ArgumentParser();parser.add_argument('lab',type=Path);args=parser.parse_args()
root=Path(__file__).resolve().parents[1];source=args.lab.read_bytes()
items=json.loads(re.search(r'const ITEMS=(\[.*?\]);',source.decode('utf-8'),re.S).group(1))
records=[]
for item in items:
    assert re.fullmatch(r'(ES|EN)_\d{2}',item['id'])
    data=base64.b64decode(item['src'].split(',',1)[1],validate=True)
    head=data.index(b'OpusHead');channels=data[head+9];rate=struct.unpack_from('<I',data,head+12)[0]
    assert channels==2 and rate==48000
    path='content/spirit-voices/'+item['id'].lower()+'.ogg'
    target=root/'public'/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    records.append(dict(id=item['id'],language=item['lang'].lower(),index=item['index'],text=item['text'],path=path,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),codec='Opus',channels=channels,sampleRate=rate))
assert len(records)==54 and all(sum(r['language']==lang for r in records)==27 for lang in ['es','en'])
manifest=dict(source=args.lab.name,sourceSha256=hashlib.sha256(source).hexdigest(),recipe='Original lab bytes; Unity Stereo recipe retained without transcoding',records=records)
(root/'content/manifests/spirit-voices.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(f'{len(records)} original clips; {sum(r["bytes"] for r in records)} bytes; Opus stereo 48 kHz')
