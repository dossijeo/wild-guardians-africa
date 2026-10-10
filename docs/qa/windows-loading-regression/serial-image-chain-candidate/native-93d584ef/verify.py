import pathlib,json,hashlib
here=pathlib.Path(__file__).resolve().parent
r=json.loads((here/'receipt.json').read_text(encoding='utf-8'))
for name,record in r['files'].items():
 data=(here/name).read_bytes();assert len(data)==record['bytes'],name;assert hashlib.sha256(data).hexdigest()==record['sha256'],name
run=json.loads((here/'run.json').read_bytes());report=json.loads((here/'desktop-smoke.json.payload').read_bytes())
assert run['id']==r['runId']==38009458201 and run['head_sha']==r['source']=='93d584ef605bab0f7144ee9c1c0629df873489fd'
assert run['status']=='completed' and run['conclusion']=='failure' and report['ok'] is False
assert report['checks']['loadingRecipe']=={'serialImageChain':True,'wallBufferPackage':False,'compileWindow':False,'resourceOverlap':False}
assert r['inputs']=={'serial_image_chain':'true','wall_buffer_package':'false','compile_window':'false','resource_overlap':'false'}
ready=report['checks']['loadingReadinessAtFinish']['readiness'];early={e['label']:e for e in ready['spans']['early']['rows']}
assert ready['spans']['early']['dropped']==0 and len(early)==16 and all(e['completed']==1 for e in early.values())
soil=early['diorama-prepare-soil-texture'];atlas=early['diorama-prepare-mountain-atlas'];bridge=early['diorama-prepare-maize-bridges'];batch=early['diorama-prepare-maize-batch']
assert soil['lastEnd']<=atlas['lastStart']<atlas['lastEnd']<bridge['lastEnd']<=batch['lastStart']
assert ready['transfers']['count']==242 and ready['transfers']['pending']==0 and ready['transfers']['failed']==0
assert ready['compilation']['windowHighWater']==0 and ready['compilation']['active'][0]['pendingIds']==[18]
assert ready['hands']['loaded']==6 and ready['chunks']['loaded']==25 and ready['chunks']['waiterCount']==0
assert report['checks']['loadingAtFinish']['readyGateReached'] is False
print('PASS: original payload/log/metadata bytes, frozen source/inputs, failed gate, observed image-chain ordering and bounded readiness scope')
