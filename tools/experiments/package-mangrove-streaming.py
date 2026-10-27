import json
from pathlib import Path
from PIL import Image
import numpy as np

p=Path('docs/qa/global-visual-lab/mangrove-mud-moss-toon-interior/streaming')
results=[]
for quality in ['media','baja']:
    data=json.loads((p/f'{quality}.json').read_text(encoding='utf-8'))
    steps=data['steps']
    for s in steps:
        im=Image.open(p/s['file']).convert('RGB')
        dest=p/Path(s['file']).with_suffix('.webp')
        im.save(dest,lossless=True)
        assert np.array_equal(np.asarray(im),np.asarray(Image.open(dest)))
    for label in ['start','away144','away288','return']:
        for phase in ['day','night']:
            a,b=[next(s for s in steps if s['label']==label and s['phase']==phase and s['enabled']==v) for v in [False,True]]
            for key in ['camera','target','chunks','calls','triangles']:assert a[key]==b[key],(quality,label,phase,key)
            aa,bb=[Image.open(p/s['file']).convert('RGB') for s in [a,b]]
            pair=Image.new('RGB',(2560,720));pair.paste(aa,(0,0));pair.paste(bb,(1280,0));pair.resize((1920,540)).save(p/f'{quality}-{label}-{phase}-pair.webp',quality=92)
    for phase in ['day','night']:
        a,b=[next(s for s in steps if s['label']==label and s['phase']==phase and s['enabled']) for label in ['start','return']]
        for key in ['camera','target','chunks']:assert a[key]==b[key],key
        aa,bb=[np.asarray(Image.open(p/s['file']).convert('RGB')).astype(int) for s in [a,b]]
        ba,br=[next(s for s in steps if s['label']==label and s['phase']==phase and not s['enabled']) for label in ['start','return']]
        baa,brr=[np.asarray(Image.open(p/s['file']).convert('RGB')).astype(int) for s in [ba,br]]
        results.append(dict(quality=quality,phase=phase,returnMAE=float(abs(aa-bb).mean()),returnMax=int(abs(aa-bb).max()),returnChangedPixels=int(np.any(aa!=bb,axis=2).sum()),baselineReturnChangedPixels=int(np.any(baa!=brr,axis=2).sum()),differingReturnDeltaPixels=int(np.any((bb-aa)!=(brr-baa),axis=2).sum()),calls=[a['calls'],b['calls']],triangles=[a['triangles'],b['triangles']],bound=[a['audit']['bound'],b['audit']['bound']],disposedOnReturn=b['disposed']))
    assert steps[0]['chunks']!=next(s for s in steps if s['label']=='away288')['chunks']
(p/'comparison.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(results))
