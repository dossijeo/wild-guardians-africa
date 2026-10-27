import json
import statistics as st
import argparse
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--directory',default='docs/qa/global-visual-lab/combined-campaign-budget')
parser.add_argument('--biomes',default='sabana,gran-rio,gran-canon,manglares,volcanes,desierto')
parser.add_argument('--qualities',default='baja')
args=parser.parse_args()
p=Path(args.directory);d=json.loads((p/'benchmarks.json').read_text(encoding='utf-8'));rows=d['records'];results=[]
expected={(q,b) for q in args.qualities.split(',') for b in args.biomes.split(',')}
assert len(rows)==len(expected)*8, ('Incomplete series',len(rows),len(expected)*8)
assert {(r['quality'],r['biome']) for r in rows}==expected
for quality,biome in sorted({(r['quality'],r['biome']) for r in rows}):
 for phase in ['day','night']:
  rr=[r for r in rows if r['quality']==quality and r['biome']==biome and r['phase']==phase]
  assert [r['variant'] for r in rr]==['base','combined','combined','base']
  assert all(r['target']==rr[0]['target'] and r['time']==rr[0]['time'] for r in rr)
  for r in rr:
   assert not r['errors']
   for mode,count in [('gpu',120),('cadence',180)]:
    v=r[mode];assert v['stateUnchanged'] and not v['glError'] and len(v['frames'])==count
    assert all(f['camera']==v['frames'][0]['camera'] for f in v['frames'])
    assert v['resolution']==[1280,720]
   g=r['gpu']['gpu'];assert g['supported'] and len(g['samples'])==120
   assert not any(g[k] for k in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','contextLost','pending'])
   assert r['cadence']['gpu'] is None
  for mode in ['gpu','cadence']:
   for key in ['camera','calls','triangles']:
    assert all([f[key] for f in r[mode]['frames']]==[f[key] for f in rr[0][mode]['frames']] for r in rr),(biome,phase,mode,key)
  values=[]
  for variant in ['base','combined']:
   rs=[r for r in rr if r['variant']==variant]
   values.append(dict(variant=variant,gpuMs=[st.mean(x['ms'] for x in r['gpu']['gpu']['samples']) for r in rs],cpuMs=[st.mean(f['cpuMs'] for f in r['cadence']['frames']) for r in rs],intervalMs=[st.mean(f['intervalMs'] for f in r['cadence']['frames']) for r in rs],intervalP95Ms=[sorted(f['intervalMs'] for f in r['cadence']['frames'])[170] for r in rs]))
  results.append(dict(quality=quality,biome=biome,phase=phase,values=values))
(p/'summary.json').write_text(json.dumps(dict(blocks=len(rows),gpuSamples=len(rows)*120,cadenceFrames=len(rows)*180,results=results),indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(results))
