import json
import statistics as st
from pathlib import Path
p=Path('docs/qa/global-visual-lab/river-grass-wear-performance');out=[]
for quality in ['media','baja']:
 rows=json.loads((p/f'benchmarks-{quality}.json').read_text(encoding='utf-8'))['records'];assert len(rows)==8
 for phase in ['day','night']:
  rr=[r for r in rows if r['phase']==phase];assert [r['variant'] for r in rr]==['original','candidate','candidate','original']
  for r in rr:
   assert not r['errors'] and not r['glError'] and r['cameraStable']
   t=r['gpu'];assert t['supported'] and len(t['samples'])==len(r['cpu'])==120
   assert not any(t[k] for k in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','contextLost','pending'])
   assert r['coverage']['stats']['overflow']==0
  for key in ['camera','target','time','calls','triangles','resolution']:assert all(r[key]==rr[0][key] for r in rr),key
  for key in ['near','far','bufferBytes']:assert all(r['coverage'][key]==rr[0]['coverage'][key] for r in rr),key
  values=[]
  for variant in ['original','candidate']:
   rs=[r for r in rr if r['variant']==variant]
   values.append(dict(variant=variant,gpuMean=st.mean(st.mean(x['ms'] for x in r['gpu']['samples']) for r in rs),cpuMean=st.mean(st.mean(r['cpu']) for r in rs),setupMs=[r['audit']['setupMs'] for r in rs],buildMs=[r['audit']['stats']['buildMs'] for r in rs],selectionMs=[r['audit']['stats']['selectionMs'] for r in rs]))
  out.append(dict(quality=quality,phase=phase,values=values,calls=rr[0]['calls'],triangles=rr[0]['triangles'],gpuDeltaMs=values[1]['gpuMean']-values[0]['gpuMean']))
(p/'summary.json').write_text(json.dumps(dict(blocks=16,gpuSamples=1920,results=out),indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(out))
