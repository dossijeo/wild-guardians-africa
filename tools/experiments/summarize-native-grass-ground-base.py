import gzip,json
from pathlib import Path
import numpy as np
from PIL import Image
root=Path('docs/qa/global-visual-lab/native-grass-ground-base')
cap=json.loads((root/'captures-media.json').read_text(encoding='utf-8'));checks=[]
for view in ['close','game']:
 for hour in ['day','night']:
  rows=[next(r for r in cap['records'] if r['view']==view and r['hour']==hour and r['variant']==v) for v in ['original','ground','continuous','original2']]
  imgs=[np.array(Image.open(root/r['file']).convert('RGB')) for r in rows]
  checks.append(dict(view=view,hour=hour,returnPixels=int(np.any(imgs[0]!=imgs[3],axis=2).sum()),changedPixels={v:int(np.any(imgs[0]!=imgs[i],axis=2).sum()) for i,v in [(1,'ground'),(2,'continuous')]},sameResources=all(all(r['render'][k]==rows[0]['render'][k] for k in ['calls','triangles','points','lines']) and r['memory']==rows[0]['memory'] for r in rows),samePose=all(r['camera']==rows[0]['camera'] and r['target']==rows[0]['target'] and r['time']==rows[0]['time'] for r in rows)))
summary=[]
for quality in ['media','baja']:
 path=root/f'benchmarks-{quality}.json'
 data=json.loads(path.read_text(encoding='utf-8') if path.exists() else gzip.decompress(Path(str(path)+'.gz').read_bytes()).decode('utf-8'));records=data['records']
 assert len(records)==24 and all(len(r['gpu']['samples'])==120 and not r['errors'] and r['cameraStable'] and not r['gpu']['disjointEvents'] for r in records)
 for view in ['close','game']:
  for phase in ['day','night']:
   row=dict(quality=quality,view=view,phase=phase)
   for variant in ['original','ground','continuous']:
    blocks=[r for r in records if r['view']==view and r['phase']==phase and r['variant']==variant];gpu=[s['ms'] for r in blocks for s in r['gpu']['samples']];cpu=[s for r in blocks for s in r['cpu']]
    row[variant]=dict(gpuMean=float(np.mean(gpu)),gpuP95=float(np.percentile(gpu,95)),cpuMean=float(np.mean(cpu)),cpuP95=float(np.percentile(cpu,95)),calls=blocks[0]['calls'],triangles=blocks[0]['triangles'],textures=blocks[0]['textures'],geometries=blocks[0]['geometries'])
   summary.append(row)
 if path.exists():Path(str(path)+'.gz').write_bytes(gzip.compress(path.read_bytes(),mtime=0))
for r in cap['records']:Image.open(root/r['file']).save((root/r['file']).with_suffix('.webp'),lossless=True)
(root/'audit.json').write_text(json.dumps(dict(captures=checks,errors=cap['errors'],benchmarks=summary),indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(dict(captures=checks,benchmarks=summary),indent=2))
