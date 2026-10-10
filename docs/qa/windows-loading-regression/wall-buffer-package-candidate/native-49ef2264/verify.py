import pathlib,json,hashlib
here=pathlib.Path(__file__).resolve().parent
r=json.loads((here/'receipt.json').read_text(encoding='utf-8'))
for name,record in r['files'].items():
 data=(here/name).read_bytes();assert len(data)==record['bytes'],name;assert hashlib.sha256(data).hexdigest()==record['sha256'],name
run=json.loads((here/'run.json').read_bytes());report=json.loads((here/'desktop-smoke.json.payload').read_bytes())
assert run['id']==r['runId']==38007229019
assert run['head_sha']==r['source']=='49ef22640983d34f50e6dc93af453e6929e828a2'
assert run['status']=='completed' and run['conclusion']=='failure'
assert report['ok'] is False and report['checks']['loadingAtFinish']['readyGateReached'] is False
assert report['checks']['loadingRecipe']=={'wallBufferPackage':True,'compileWindow':False,'resourceOverlap':False}
ready=report['checks']['loadingReadinessAtFinish']['readiness']
assert ready['transfers']['count']==83 and ready['transfers']['pending']==0 and ready['transfers']['failed']==0
assert ready['compilation']['started']==10 and ready['compilation']['completed']==9
assert ready['compilation']['windowHighWater']==0
assert ready['compilation']['active'][0]['pendingIds']==[19]
assert ready['spans']['early']['dropped']==0
assert ready['hands']['loaded']==6 and ready['chunks']['loaded']==25
print('PASS: original raw/log/metadata hashes, source/options, failed gate and bounded readiness scope')
