import json
from pathlib import Path
import numpy as np
from PIL import Image

p=Path('docs/qa/global-visual-lab/obstruction-transparent-probe')
meta=json.loads((p/'probe.json').read_text(encoding='utf-8'))
assert len(meta['images'])==4 and all(not x['glError'] for x in meta['images'])
images={(d,m):Image.open(p/f'depth-{str(d).lower()}-marker-{str(m).lower()}.png').convert('RGB') for d in [True,False] for m in [False,True]}
arrays={k:np.asarray(v,dtype=np.int16) for k,v in images.items()}
signal={d:np.max(np.abs(arrays[d,True]-arrays[d,False]),axis=2) for d in [True,False]}
lost=(signal[False]>20)&(signal[True]<2)
report={'controlledVisibility':meta['selected']['visibility'],'baselineChangedPixels':int(np.any(arrays[True,False]!=arrays[False,False],axis=2).sum()),'markerVisibleWithoutAuxiliary':int((signal[False]>20).sum()),'markerVisibleWithAuxiliary':int((signal[True]>20).sum()),'markerPixelsEntirelyBlocked':int(lost.sum()),'note':'Diagnostic marker, not gameplay smoke. Fade color hidden in both conditions; alpha held at .35; no performance claim.'}
assert report['markerVisibleWithoutAuxiliary']>1000, 'Probe does not expose marker'
pair=Image.new('RGB',(2560,720));pair.paste(images[True,True]);pair.paste(images[False,True],(1280,0));pair.save(p/'aux-depth-on-off.webp',lossless=True)
mask=np.zeros((720,1280,3),dtype=np.uint8);mask[lost]=[255,0,255];Image.fromarray(mask).save(p/'blocked-pixels.webp',lossless=True)
(p/'analysis.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(report))
