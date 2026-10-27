import json
from pathlib import Path
root=Path('docs/qa/global-visual-lab/current-review-20261025')
rows=[]
for biome in ['sabana','manglares']:
 report=json.loads((root/f'{biome}-resident-mask-lifecycle.json').read_text(encoding='utf-8'))
 r=report['result']['residentGroundLifecycle']
 assert 'groundResidentMask=1' in report['url']
 assert not [e for e in report['errors'] if 'X4000' not in e]
 assert r['quality']['worldUnchanged'] and r['context']['worldUnchanged']
 assert [x['quality'] for x in r['quality']['rows']]==['media','baja','media','baja']
 assert r['context']['backend']=='pthreads' and r['context']['drawCalls']>0
 for key in ['before','afterQuality','afterContext']:
  assert len(r[key])==1 and r[key][0]['bytes']==256
  assert r[key][0]['residentCells']==25
  assert r[key][0]['bounds']==r['before'][0]['bounds']
 rows.append({'biome':biome,'before':r['before'],'afterQuality':r['afterQuality'],'afterContext':r['afterContext'],'worldUnchanged':True,'contextRecoveryMs':r['context']['recovery']['ms'],'nativeBytes':r['context']['nativeBytes']})
(root/'resident-mask-lifecycle-summary.json').write_text(json.dumps({'scope':'Paused populated scene; four quality changes then WebGL loss/restore. CPU mask bytes checked against visible chunks; actual renderer restoration verified. Not a frame-time benchmark or all-camera visual proof.','rows':rows},indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(rows,indent=2))
