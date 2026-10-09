import subprocess,json,hashlib,gzip,pathlib
ref='a6893053'
def read(path,revision=ref):
    return subprocess.check_output(['git','show',revision+':'+path])
receipt=json.loads(read('docs/qa/horde-entry-retry/cooperative-source-receipt.json'))
for path,digest in receipt['sourceAndLogs'].items():
    assert hashlib.sha256(read(path)).hexdigest()==digest,path
comparison=json.loads(read('docs/qa/horde-entry-retry/cooperative-physical-comparison.json'))
rows=[]
for row in comparison['rows']:
    prefix='desert' if row['biome']=='desierto' else row['biome']
    current='docs/qa/horde-entry-retry/'+prefix+'-cooperative-physical/'
    historical='docs/qa/horde-entry-retry/'+prefix+'-physical-exit-observed/'
    for path,expected in row['payloads'].items():
        data=read(path)
        assert len(data)==expected['bytes'] and hashlib.sha256(data).hexdigest()==expected['sha256'],path
        if path.endswith('.gz'):
            assert hashlib.sha256(gzip.decompress(data)).hexdigest()==expected['uncompressedSHA256'],path
    raw=json.loads(read(current+'physical.json'))
    old=json.loads(read(historical+'physical.json','d4d12580'))
    for key in ['initialSnapshotSHA256','spawnStateSHA256','finalSnapshotSHA256']:
        assert raw[key]==old[key],(prefix,key)
    for name in ['initial-state.json.gz','final-state.json.gz']:
        assert gzip.decompress(read(current+name))==gzip.decompress(read(historical+name,'d4d12580')),(prefix,name)
    actors=raw['terminalActors']
    assert len(actors)==12 and len({a['id'] for a in actors})==12
    for a in actors:
        assert a['status']=='gone' and a['exitDistance']==0
        assert a['x']==a['exit']['x'] and a['z']==a['exit']['z']
    events=json.loads(gzip.decompress(read(current+'events.json.gz')))
    assert sum(e['type']=='RaidSpawned' for e in events)==1
    assert sum(e['type']=='RaidEnded' for e in events)==1
    hits=sum(e['type']=='StructureHit' for e in events)
    assert sum(a['initialHits']-a['unusedHits'] for a in actors)==hits==2
    rows.append({'biome':row['biome'],'exits':12,'actualHits':hits,'unusedHits':sum(a['unusedHits'] for a in actors),'initialAndFinalBytesMatchHistorical':True})
print(json.dumps({'scope':'Root read-only immutable source/payload audit, not a campaign or fresh simulation','commit':subprocess.check_output(['git','rev-parse',ref],text=True).strip(),'sourceAndLogHashes':len(receipt['sourceAndLogs']),'rows':rows},indent=2))
