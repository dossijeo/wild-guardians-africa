import json
from pathlib import Path
import numpy as np
from PIL import Image

root=Path('docs/qa/global-visual-lab/volcanes-origin-isolation-20261022')
rows=[]
for phase in ['day','night']:
    path=root/f'media-{phase}.json'
    if not path.exists(): continue
    data=json.loads(path.read_text(encoding='utf-8'))
    assert data['stateUnchanged'] and not data['errors']
    records=data['records']
    for before,after in [(0,1),(0,2),(1,3),(0,4)]:
        a=np.asarray(Image.open(root/f'media-{phase}-{before}.png').convert('RGB')).astype('int16')
        b=np.asarray(Image.open(root/f'media-{phase}-{after}.png').convert('RGB')).astype('int16')
        d=np.abs(a-b);mask=np.any(d,axis=2);ys,xs=np.where(mask)
        for key in ['camera','target','chunks','elapsed','time']:
            assert records[before][key]==records[after][key], (phase,key)
        rows.append(dict(phase=phase,before=before,after=after,
            beforeOrigin=records[before]['origin'],afterOrigin=records[after]['origin'],
            changedPixels=int(mask.sum()),maxDelta=int(d.max()),
            bounds=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)] if len(xs) else None,
            beforeCalls=records[before]['calls'],afterCalls=records[after]['calls'],
            beforeTriangles=records[before]['triangles'],afterTriangles=records[after]['triangles']))
        if after==1:
            pair=Image.new('RGB',(2560,720));pair.paste(Image.fromarray(a.astype('uint8')));pair.paste(Image.fromarray(b.astype('uint8')),(1280,0));pair.resize((1280,360)).save(root/f'{phase}-origin-pair.jpg',quality=94)
report={'complete':len(rows)==8,'rows':rows}
(root/'comparison.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(report,indent=2))
