"""Summarize the four current-recipe Sabana streaming runs; no causal verdict."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]/'docs/qa/global-visual-lab/current-review-20261025'
rows=[]
for run in ['a1','b1','a2','b2']:
 p=root/('sabana-clean-retention-'+run+'.json')
 d=json.loads(p.read_text(encoding='utf-8'));r=d['result'];s=r['streaming']
 assert d['biome']=='sabana' and d['quality']=='media'
 assert s['options']['distance']==96 and s['options']['frames']==180
 assert r['streamingOptions']['retainPrograms']==run.startswith('b')
 assert s['farSettled'] and s['actorsReadyFrames']==180 and s['pausedFrames']==0
 assert s['gpu']['supported'] and not s['gpu']['disjoint']
 errors=[e for e in d['errors'] if 'X4000' not in e]
 assert not errors,errors
 rows.append({'run':run,'source':p.name,'created':s['created'],'frames':s['summary']['frames'],
  'gpu':s['gpu']['summary'],'draw':s['summary']['draw'],'elapsed':s['elapsed'],
  'retention':r['programRetention'],'options':r['streamingOptions']})
result={'scope':'Interleaved active simulation, 180 authored camera frames plus settling. Wall-clock world evolution and settling sample counts vary; GPU queries include pipeline bubbles. Not exact workload parity.','runs':rows}
(root/'sabana-clean-retention-summary.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
for r in rows:print(r['run'],'RAF',r['frames'],'GPU',r['gpu'],'drawMax',r['draw']['max'])
