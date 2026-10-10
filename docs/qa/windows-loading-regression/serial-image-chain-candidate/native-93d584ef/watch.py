import subprocess,json,time,pathlib,datetime,os
out=pathlib.Path(__file__).resolve().parent
run=38009458201
(out/'watcher-process.json').write_text(json.dumps({'pid':os.getpid(),'runId':run,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pollSeconds':50},indent=2),encoding='utf-8')
last=None
while True:
 r=subprocess.run(['gh','run','view',str(run),'--json','databaseId,headSha,event,status,conclusion,url,createdAt,updatedAt,jobs'],capture_output=True)
 if r.returncode:
  print('Observation request failed; preserving stderr and backing off, no dispatch',flush=True)
  with (out/'watch-errors.log').open('ab') as f:f.write(r.stderr)
  time.sleep(50);continue
 data=json.loads(r.stdout);assert data['headSha']=='93d584ef605bab0f7144ee9c1c0629df873489fd'
 (out/'latest-run.json').write_bytes(r.stdout)
 with (out/'watch.jsonl').open('a',encoding='utf-8') as f:f.write(json.dumps({'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'run':data})+'\n')
 active=[s['name'] for j in data['jobs'] for s in j.get('steps',[]) if s['status']=='in_progress']
 marker=(data['status'],data['conclusion'],tuple(active))
 if marker!=last:print(json.dumps({'status':data['status'],'conclusion':data['conclusion'],'active':active}),flush=True);last=marker
 if data['status']=='completed':
  (out/'terminal-run.json').write_bytes(r.stdout)
  break
 time.sleep(50)
