"""Bake each native village unit in isolation, preserving packed vertex indices.
Blender -b --python tools/lighting/bake_village_ao.py -- --culture suajili
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
from vertex_visibility import bake_visibility
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--culture',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
pack=next(x for x in json.loads((ROOT/'public/content/villages.json').read_text(encoding='utf8')) if x['id']==a.culture)
source=(ROOT/'public'/pack['binary']['url'].lstrip('/')).read_bytes()
vertices=np.frombuffer(source,dtype='<f4',count=pack['vertexBytes']//4).reshape((-1,8))
indices=np.frombuffer(source,dtype='<u4',count=pack['indexCount'],offset=pack['vertexBytes'])
values=np.full(len(vertices),255,dtype=np.uint8);used=np.zeros(len(vertices),dtype=bool);records=[];started=time.perf_counter()
for unit in pack['units']:
    triangles=indices[unit['offset']:unit['offset']+unit['count']].reshape((-1,3))
    ids,inverse=np.unique(triangles,return_inverse=True)
    if np.any(used[ids]):raise ValueError('Village units share vertices; separate visibility needed')
    local=vertices[ids]
    baked,radius,stats=bake_visibility(local[:,:3],local[:,3:6],inverse.reshape((-1,3)))
    values[ids]=baked;used[ids]=True
    records.append(dict(key=unit['key'],vertices=len(ids),radius=radius,mean=float(baked.mean()),minimum=int(baked.min()),**stats))
    print(json.dumps(records[-1]),flush=True)
output=ROOT/'public/content/lighting/global-ao';output.mkdir(parents=True,exist_ok=True)
name='village-'+a.culture;blob=values.tobytes();(output/(name+'.bin')).write_bytes(blob)
report=dict(culture=a.culture,source=pack['binary']['url'],sourceSHA256=hashlib.sha256(source).hexdigest(),binary='/content/lighting/global-ao/'+name+'.bin',outputSHA256=hashlib.sha256(blob).hexdigest(),byteLength=len(blob),samples=32,records=records,unusedVertices=int(np.count_nonzero(~used)),seconds=time.perf_counter()-started)
(output/(name+'.json')).write_text(json.dumps(report,indent=2),encoding='utf8')
print('VILLAGE_AO_COMPLETE',a.culture,len(blob),flush=True)
