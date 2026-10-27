import json
from pathlib import Path
import numpy as np
from PIL import Image

base=Path('docs/qa/global-visual-lab/volcanes-populated-roundtrip-20261022')
out=Path('docs/qa/global-visual-lab/volcanes-horizon-lava-20261022')
rows=[]
for phase in ['day','night']:
    if not (out/f'media-{phase}.json').exists(): continue
    a=json.loads((base/f'media-{phase}.json').read_text(encoding='utf-8'))
    b=json.loads((out/f'media-{phase}.json').read_text(encoding='utf-8'))
    assert b['stateUnchanged'] and not b['errors']
    for i,(x,y) in enumerate(zip(a['records'],b['records'])):
        for key in ['camera','target','origin','chunks','elapsed','time','calls','triangles']:
            assert x[key]==y[key], (phase,i,key,x[key],y[key])
        old=Image.open(base/f'media-{phase}-{i}.png').convert('RGB')
        new=Image.open(out/f'media-{phase}-{i}.png').convert('RGB')
        delta=np.abs(np.asarray(old).astype('int16')-np.asarray(new).astype('int16'))
        rows.append(dict(phase=phase,step=i,changedPixels=int(np.any(delta,axis=2).sum()),maxDelta=int(delta.max())))
        if i in [0,2]:
            pair=Image.new('RGB',(2560,720));pair.paste(old);pair.paste(new,(1280,0));pair.resize((1280,360)).save(out/f'{phase}-{i}-baseline-candidate.jpg',quality=95)
report={'complete':len(rows)==10,'rows':rows}
(out/'comparison.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(report,indent=2))
