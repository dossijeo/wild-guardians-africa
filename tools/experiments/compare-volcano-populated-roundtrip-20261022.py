import json,os
from pathlib import Path
import numpy as np
from PIL import Image

root=Path(os.environ.get('WG_ROUNDTRIP_DIR','docs/qa/global-visual-lab/volcanes-populated-roundtrip-20261022'))
rows=[]
for phase in ['day','night']:
    data=json.loads((root/f'media-{phase}.json').read_text(encoding='utf-8'))
    assert data['stateUnchanged'] and not data['errors']
    records=data['records']
    assert len(records)==5 and all(not r['glError'] for r in records)
    for before,after in [(0,2),(2,4)]:
        a=np.asarray(Image.open(root/f'media-{phase}-{before}.png').convert('RGB')).astype('int16')
        b=np.asarray(Image.open(root/f'media-{phase}-{after}.png').convert('RGB')).astype('int16')
        d=np.abs(a-b)
        for key in ['camera','target','chunks','elapsed','time']:
            assert records[before][key]==records[after][key], (phase,key)
        rows.append(dict(phase=phase,before=before,after=after,
            changedPixels=int(np.any(d,axis=2).sum()),maxDelta=int(d.max()),
            beforeOrigin=records[before]['origin'],afterOrigin=records[after]['origin'],originMatches=records[before]['origin']==records[after]['origin'],
            beforeCalls=records[before]['calls'],afterCalls=records[after]['calls'],
            beforeTriangles=records[before]['triangles'],afterTriangles=records[after]['triangles'],
            beforeMemory=records[before]['memory'],afterMemory=records[after]['memory']))
        pair=Image.new('RGB',(2560,720));pair.paste(Image.fromarray(a.astype('uint8')));pair.paste(Image.fromarray(b.astype('uint8')),(1280,0));pair.resize((1280,360)).save(root/f'{phase}-{before}-{after}-pair.jpg',quality=94)
(root/'comparison.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(rows,indent=2))
