from pathlib import Path
import json
from PIL import Image
p=Path('docs/qa/global-visual-lab/mangrove-mud-moss-toon-interior/motion')
d=json.loads((p/'media.json').read_text(encoding='utf-8'));assert not d['errors'] and d['identity'] and d['normalIdentityAfter']
for phase in ['day','night']:
    for i in range(36):
        a,b=[next(s for s in d['steps'] if s['phase']==phase and s['enabled']==v and s['frame']==i) for v in [False,True]]
        for key in ['camera','target','calls','triangles']:assert a[key]==b[key],(phase,i,key)
        assert a['glError']==b['glError']==0
        if i in [0,17,35]:
            pair=Image.new('RGB',(2560,720));pair.paste(Image.open(p/a['file']),(0,0));pair.paste(Image.open(p/b['file']),(1280,0));pair.resize((1920,540)).save(p/f'{phase}-{i:03}-pair.webp',quality=94)
(p/'audit.json').write_text(json.dumps(dict(frames=144,matchedPairs=72,normalIdentity=True,errors=0,note='Captured fixed steps; video six frames per second, not realtime performance.'),indent=2)+'\n',encoding='utf-8',newline='\n')
