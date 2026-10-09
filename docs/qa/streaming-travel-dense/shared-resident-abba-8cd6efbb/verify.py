"""Read-only verification of the preserved native ABBA reports (Python 3)."""
import gzip
import hashlib
import json
import math
from pathlib import Path

folder=Path(__file__).resolve().parent
manifest=json.loads((folder/'manifest.json').read_text(encoding='utf8'))
def sha(data): return hashlib.sha256(data).hexdigest()
raw={}
for name,record in manifest['artifacts'].items():
    packed=(folder/name).read_bytes()
    assert sha(packed)==record['gzipSha256'],name
    data=gzip.decompress(packed)
    assert len(data)==record['rawBytes'] and sha(data)==record['rawSha256'],name
    raw[record['rawName']]=data
fixture=(folder/'streaming-travel.html.gz').read_bytes()
assert sha(fixture)==manifest['fixture']['gzipSha256']
assert sha(gzip.decompress(fixture))==manifest['fixture']['sha256']
def summary(values):
    values=sorted(v for v in values if v is not None)
    if not values: return {'count':0}
    return {'count':len(values),**{key:values[math.ceil(len(values)*p)-1] for key,p in [('p50',.5),('p95',.95),('p99',.99)]},'max':values[-1]}
def position(at): return min(15,max(0,at/1000))*12
reports={arm:json.loads(raw[arm+'-final.json']) for arm in ['A1','B1','B2','A2']}
reference=reports['A1']
rows={}
query_total=0
for arm,report in reports.items():
    closed=json.loads(raw[arm+'-disposed.json'])
    assert json.loads(raw[arm+'-console.json'])==[],arm
    assert report['done'] and report['logicalUnchanged'] and report['errors']==[],arm
    assert closed['disposed'] and closed['contextLost'] and closed['errors']==[],arm
    assert report['sharedPreparation']==arm.startswith('B'),arm
    for key in ['device','farm','biome','culture','quality','seed','duration','speed','distance','initialEye','initialTarget','finalEye','finalTarget','initialStream','finalStream','isolatedPreparation','ownedCompilation','ownedWaits','chunkPhases','preparationInterval']:
        assert report[key]==reference[key],(arm,key)
    assert report['device']['viewport']==[1280,720] and report['device']['drawingBuffer']==[1600,900] and report['device']['dpr']==1.25
    gpu=report['gpu']
    assert gpu['supported'] and not gpu['contextLost']
    for key in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','pending']:
        assert gpu[key]==0 and closed['gpu'][key]==0,(arm,key)
    frames=report['frames']; samples=gpu['samples']
    assert len(samples)==len(frames) and {s['frame'] for s in samples}==set(range(len(frames))),arm
    assert not any(f['hidden'] for f in frames),arm
    query_total+=len(samples)
    segments=report['segments']
    def subset(name): return [s for s in segments if s['name']==name]
    calls=subset('compileAsync')
    bins=[]
    for low in range(0,180,30):
        selected=[i for i,f in enumerate(frames) if low<=position(f['at'])<low+30 or low==150 and position(f['at'])==180]
        selected_set=set(selected)
        local_calls=[s for s in calls if low<=position(s['at'])<low+30]
        bins.append({'meters':[low,low+30],'frameIntervals':summary([frames[i]['intervalMs'] for i in selected]),'frameCpu':summary([frames[i]['cpuMs'] for i in selected]),'gpu':summary([s['ms'] for s in samples if s['frame'] in selected_set]),'compileCalls':{kind:summary([s['cpuMs'] for s in local_calls if s.get('preparationRoot',{}).get('kind','unspecified')==kind]) for kind in sorted({s.get('preparationRoot',{}).get('kind','unspecified') for s in local_calls})}})
    seam=[s for s in subset('renderBufferDirect') if s.get('cacheKey')=='far-ground-native-water-mask-v1:seam-v2']
    rows[arm]={'frameIntervals':summary([f['intervalMs'] for f in frames]),'frameCpu':summary([f['cpuMs'] for f in frames]),'gpu':summary([s['ms'] for s in samples]),'intervalsOver100':sum((f['intervalMs'] or 0)>100 for f in frames),'compileCalls':len(calls),'compileScopes':{},'positions':bins,'seamDraws':[{**s,'meters':position(s['at'])} for s in seam],'traceCategories':{name:summary([s['cpuMs'] for s in subset(name)]) for name in ['compileAsync','render','renderBufferDirect','far.attachData','ground.attach','assetGroups.update','far.update','world.sync','world.syncChunks','initTexture']}}
    for call in calls:
        scope=call.get('preparationRoot',{}).get('kind','unspecified')
        rows[arm]['compileScopes'][scope]=rows[arm]['compileScopes'].get(scope,0)+1
assert query_total==1004,query_total
result={'verified':True,'performanceAccepted':False,'totalGpuSamples':query_total,'unionAdapterCountersSummed':False,'rows':rows}
print(json.dumps(result,indent=2))
