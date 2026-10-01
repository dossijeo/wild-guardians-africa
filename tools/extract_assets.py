"""Reproducible, lossless extraction of the supplied offline laboratories.

Binary resources are deduplicated by SHA-256. No re-encoding or normalization.
Large payloads are split so that no file exceeds GitHub's ordinary file limit.
"""
import argparse, base64, gzip, hashlib, json, pathlib, re, struct

parser = argparse.ArgumentParser()
parser.add_argument('--source', default=r'C:\Users\PC\Desktop\Wild Guardians New')
args = parser.parse_args()
repo = pathlib.Path(__file__).resolve().parents[1]
assets = repo/'public'/'assets'
refs = repo/'references'/'extracted'
assets.mkdir(parents=True, exist_ok=True)
refs.mkdir(parents=True, exist_ok=True)
inventory, resources, clips = [], {}, []

def digest(data): return hashlib.sha256(data).hexdigest()

def store(data, mime='application/octet-stream', origin=''):
    sha = digest(data)
    ext = 'bin'
    if data[:4] == b'glTF': ext='glb'
    elif data[:4] == b'RIFF' and data[8:12] == b'WEBP': ext='webp'
    elif data[:4] == b'RIFF' and data[8:12] == b'WAVE': ext='wav'
    elif data[:3] == b'\xff\xd8\xff': ext='jpg'
    elif data[:8] == b'\x89PNG\r\n\x1a\n': ext='png'
    elif data[:3] == b'ID3' or mime == 'audio/mpeg': ext='mp3'
    elif 'font' in mime or data[:4] in (b'\x00\x01\x00\x00', b'OTTO'): ext='ttf'
    elif data[:4] == b'wOF2': ext='woff2'
    elif mime=='image/svg+xml': ext='svg'
    elif data[:10] == b'#?RADIANCE': ext='hdr'
    url=f'/assets/{sha}.{ext}'
    target=assets/(sha+'.'+ext)
    if not target.exists(): target.write_bytes(data)
    if sha not in resources:
        resources[sha]={'url':url,'bytes':len(data),'sha256':sha,'mime':mime,'origins':[]}
        if ext=='glb':
            length,kind=struct.unpack_from('<II',data,12)
            gltf=json.loads(data[20:20+length])
            clips.append({'url':url,'source':origin,'animations':[{'name':a.get('name',''),'channels':len(a.get('channels',[]))} for a in gltf.get('animations',[])], 'nodes':len(gltf.get('nodes',[])),'meshes':len(gltf.get('meshes',[])),'extras':gltf.get('asset',{}).get('extras',{})})
    if origin not in resources[sha]['origins']: resources[sha]['origins'].append(origin)
    return url

data_pattern=re.compile(r'data:([^;,\s]+);base64,([A-Za-z0-9+/=\r\n]+)')
def replace_data(match,origin):
    return store(base64.b64decode(match.group(2)),match.group(1),origin)

def transform(value,origin,key=''):
    if isinstance(value,dict):
        # Preserve all original metadata, replacing only embedded bytes.
        mime=value.get('mime',value.get('mime_type','application/octet-stream'))
        result={}
        for k,v in value.items():
            if isinstance(v,str) and len(v)>500 and re.fullmatch(r'[A-Za-z0-9+/=\r\n]+',v):
                result[k]={'url':store(base64.b64decode(v),mime,origin+':'+k),'encoding':'external-binary'}
            else: result[k]=transform(v,origin+':'+k,k)
        return result
    if isinstance(value,list): return [transform(v,origin+':'+str(i),key) for i,v in enumerate(value)]
    if isinstance(value,str): return data_pattern.sub(lambda m:replace_data(m,origin),value)
    return value

for path in sorted(pathlib.Path(args.source).glob('*.html')):
    raw=path.read_bytes()
    source=raw.decode('utf-8')
    slug=path.stem
    folder=refs/slug
    folder.mkdir(exist_ok=True)
    record={'file':path.name,'sha256':digest(raw),'bytes':len(raw),'payloads':[],'code':[]}
    for n,(attrs,body) in enumerate(re.findall(r'<script\b([^>]*)>(.*?)</script>',source,re.S|re.I)):
        identifier=re.search(r'\bid="([^"]+)"',attrs)
        identifier=identifier.group(1) if identifier else f'script-{n}'
        origin=path.name+'#'+identifier
        if 'application/json' in attrs:
            payload=transform(json.loads(body),origin)
            out=folder/(identifier+'.json')
            out.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
            record['payloads'].append({'id':identifier,'path':out.relative_to(repo).as_posix()})
        elif 'application/octet-stream' in attrs:
            body=body.strip()
            if body.startswith('data:'): url=data_pattern.sub(lambda m:replace_data(m,origin),body)
            else:
                data=base64.b64decode(body)
                if data[:2]==b'\x1f\x8b':
                    data=gzip.decompress(data)
                    try:
                        payload=transform(json.loads(data),origin)
                        out=folder/(identifier+'.json')
                        out.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
                        record['payloads'].append({'id':identifier,'path':out.relative_to(repo).as_posix(),'encoding':'gzip-json'})
                        continue
                    except (ValueError,UnicodeDecodeError): pass
                url=store(data,origin=origin)
            record['payloads'].append({'id':identifier,'url':url})
        else:
            code=data_pattern.sub(lambda m:replace_data(m,origin),body)
            out=folder/(identifier+'.js')
            out.write_text(code,encoding='utf-8')
            record['code'].append(out.relative_to(repo).as_posix())
    markup=re.sub(r'<script\b[^>]*>.*?</script>','',source,flags=re.S|re.I)
    markup=data_pattern.sub(lambda m:replace_data(m,path.name+'#markup'),markup)
    (folder/'markup.html').write_text(markup,encoding='utf-8')
    record['markup']=(folder/'markup.html').relative_to(repo).as_posix()
    inventory.append(record)
    print(path.name, 'extracted',flush=True)

(repo/'content'/'manifests'/'assets.json').write_text(json.dumps({'sources':inventory,'resources':list(resources.values()),'models':clips},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(inventory)} labs, {len(resources)} unique binary assets, {sum(r["bytes"] for r in resources.values())/1e6:.1f} MB')
