import json,sys,statistics,math,collections
from pathlib import Path

root=Path(sys.argv[1]);data=json.loads((root/'streaming.json').read_text(encoding='utf-8'))
rows=data['records']
expected=['engine-events','engine-selection'] if '--effective-selection' in sys.argv else ['combined','engine-events']
assert [r['variant'] for r in rows]==expected*2
out=[];reference=None
for record in rows:
 stream=record['streaming'];assert not record['errors'] and stream['frames']==360
 signature=collections.Counter(x['key'] for x in stream['completed'])
 if reference is None:reference=signature
 assert signature==reference,'Different installed chunk workloads'
 assert stream['finalKeys']==rows[0]['streaming']['finalKeys']
 row={'variant':record['variant'],'completed':len(stream['completed']),
  'cancelled':len(stream['cancelled']),'worker':stream['worker']}
 for metric in ['buildMs','installMs','latencyMs']:
  values=sorted(x[metric] for x in stream['completed'])
  assert values and all(math.isfinite(x) and x>=0 for x in values)
  row[metric]={'mean':statistics.mean(values),'median':statistics.median(values),
   'p95':values[math.ceil(len(values)*.95)-1],'max':max(values)}
 out.append(row);print(row)
(root/'summary.json').write_text(json.dumps({'scope':'Instrumented request-to-install latency, not presentation or FPS',
 'sameInstalledChunkMultiset':True,'rows':out},indent=2)+'\n',encoding='utf-8',newline='\n')
