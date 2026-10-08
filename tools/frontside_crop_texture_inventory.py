"""Read image headers in original/runtime crop GLBs; no decoding or GPU claim."""
import json,struct,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def dimensions(data):
    if data[:8]==b'\x89PNG\r\n\x1a\n':return 'PNG',*struct.unpack_from('>II',data,16)
    if data[:2]==b'\xff\xd8':
        pos=2
        while pos<len(data):
            if data[pos]!=255:pos+=1;continue
            while data[pos]==255:pos+=1
            marker=data[pos];pos+=1
            if marker in [1,0xd8,0xd9] or 0xd0<=marker<=0xd7:continue
            size=struct.unpack_from('>H',data,pos)[0]
            if marker in [0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]:
                height,width=struct.unpack_from('>HH',data,pos+3);return 'JPEG',width,height
            pos+=size
    if data[:4]==b'RIFF' and data[8:12]==b'WEBP':
        pos=12
        while pos+8<=len(data):
            kind=data[pos:pos+4];size=struct.unpack_from('<I',data,pos+4)[0];part=data[pos+8:pos+8+size]
            if kind==b'VP8X':return 'WebP',1+int.from_bytes(part[4:7],'little'),1+int.from_bytes(part[7:10],'little')
            if kind==b'VP8L' and part[0]==0x2f:
                bits=int.from_bytes(part[1:5],'little');return 'WebP',1+(bits&0x3fff),1+((bits>>14)&0x3fff)
            if kind==b'VP8 ' and part[3:6]==b'\x9d\x01\x2a':
                w,h=struct.unpack_from('<HH',part,6);return 'WebP',w&0x3fff,h&0x3fff
            pos+=8+size+(size%2)
    return 'UNKNOWN',None,None

def inventory(relative):
    path=ROOT/'public'/relative.lstrip('/');raw=path.read_bytes();pos=12;doc=None;binary=None
    assert raw[:4]==b'glTF'
    while pos<len(raw):
        length,kind=struct.unpack_from('<II',raw,pos);chunk=raw[pos+8:pos+8+length]
        if kind==0x4e4f534a:doc=json.loads(chunk)
        if kind==0x004e4942:binary=chunk
        pos+=8+length
    images=[]
    for index,image in enumerate(doc.get('images',[])):
        if 'bufferView' in image:
            view=doc['bufferViews'][image['bufferView']];start=view.get('byteOffset',0);data=binary[start:start+view['byteLength']]
        else:
            target=(path.parent/image['uri']).resolve();assert target.is_relative_to(ROOT.resolve());data=target.read_bytes()
        kind,width,height=dimensions(data);mip_pixels=0
        if width and height:
            w,h=width,height
            while True:
                mip_pixels+=w*h
                if w==1 and h==1:break
                w=max(1,w//2);h=max(1,h//2)
        images.append(dict(image=index,format=kind,width=width,height=height,encodedBytes=len(data),sha256=hashlib.sha256(data).hexdigest(),hypotheticalRGBA8MipBytes=mip_pixels*4 if mip_pixels else None))
    return dict(url=relative,sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),images=images,textures=doc.get('textures',[]),materials=doc.get('materials',[]))

def main():
    models=json.loads((ROOT/'public/content/models.json').read_text(encoding='utf8'))
    source=next(m for m in models if 'Cultivos' in m['source'])['url']
    manifest=json.loads((ROOT/'content/manifests/web-assets.json').read_text(encoding='utf8'))
    record=next(r for r in manifest['records'] if '/'+r['source']==source)
    result=dict(status='HEADER_INVENTORY_NOT_RESIDENT_GPU_MEASUREMENT',source=inventory(source),runtime=inventory(record['runtime']),
        limitations=['RGBA8 complete mip-chain size is a hypothetical format bound; allocation, sharing, compression, uploaded levels and GPU ownership are not observed.',
            'Image dimensions/hashes do not establish pixel parity or normal-map shader equivalence.',
            'Original/runtime files are read only; no asset or decoder configuration changes.'])
    output=ROOT/'docs/qa/frontside-model-pilot/crop-texture-header-inventory.json'
    output.write_bytes((json.dumps(result,indent=2)+'\n').encode())
    print(json.dumps({k:[dict(width=i['width'],height=i['height'],format=i['format'],hypotheticalRGBA8MipBytes=i['hypotheticalRGBA8MipBytes']) for i in result[k]['images']] for k in ['source','runtime']}))

if __name__=='__main__':main()
