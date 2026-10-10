from pathlib import Path
import subprocess,json,hashlib,shutil,zipfile,io
root=Path.cwd();run=38009458201;source='93d584ef605bab0f7144ee9c1c0629df873489fd'
out=root/'docs/qa/windows-loading-regression/serial-image-chain-candidate/native-93d584ef';out.mkdir(exist_ok=True)
repo='repos/dossijeo/wild-guardians-africa'
def api(path):return subprocess.check_output(['gh','api',path])
r=api(f'{repo}/actions/runs/{run}');data=json.loads(r)
assert data['status']=='completed' and data['head_sha']==source
(out/'run.json').write_bytes(r)
(out/'jobs.json').write_bytes(api(f'{repo}/actions/runs/{run}/jobs'))
a=api(f'{repo}/actions/runs/{run}/artifacts');(out/'artifacts.json').write_bytes(a)
(out/'full.log').write_bytes(subprocess.check_output(['gh','run','view',str(run),'--log']))
for name in ['dispatch.json','dispatch.stdout','dispatch.stderr','prelaunch-runs.json','identified-run.json','watcher-process.json','watch.jsonl','terminal-run.json']:
 shutil.copyfile(root/'.cache/serial-image-chain-dispatch'/name,out/name)
receipts=[]
for item in json.loads(a)['artifacts']:
 if not any(x in item['name'] for x in ['desktop-smoke','desktop-visibility','visibility-fixture']):continue
 payload=api(f"{repo}/actions/artifacts/{item['id']}/zip")
 name=item['name'].replace('/','_')
 (out/(name+'.payload')).write_bytes(payload)
 record={'id':item['id'],'name':item['name'],'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()}
 if payload.lstrip().startswith((b'{',b'[')):
  json.loads(payload);(out/(name+'.json')).write_bytes(payload);record['encoding']='direct-json'
 elif zipfile.is_zipfile(io.BytesIO(payload)):
  with zipfile.ZipFile(io.BytesIO(payload)) as z:
   record['encoding']='zip';record['members']=z.namelist()
   for entry in z.infolist():
    if entry.is_dir():continue
    target=out/(name+'-'+Path(entry.filename).name);target.write_bytes(z.read(entry))
 else:record['encoding']='binary-unparsed'
 receipts.append(record)
(out/'artifact-payload-receipts.json').write_text(json.dumps(receipts,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'conclusion':data['conclusion'],'artifacts':receipts}),flush=True)
