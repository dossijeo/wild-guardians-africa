"""Remove Blender's constant full-rig channels so animation layers stay independent."""
import json,pathlib,struct
ROOT=pathlib.Path(__file__).resolve().parents[2]
p=pathlib.Path(globals().get('guardian_glb',ROOT/'public/content/guardian/guardian.glb'));data=p.read_bytes();size=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+size]);binary=bytearray(data[20+size:])
for anim in doc.get('animations',[]):
 channels=[]
 for c in anim['channels']:
  node=doc['nodes'][c['target']['node']].get('name','');path=c['target']['path']
  if anim['name'].startswith('Mantle_'):keep=node.startswith(('Mantle.','Feather.','Wood.')) and path in ['translation','rotation']
  elif anim['name']=='Float':keep=node=='Root' and path in ['translation','rotation']
  else:keep=node in ['Torso','Head','Shoulder.L','Shoulder.R','Arm.L','Arm.R','Forearm.L','Forearm.R','Hand.L','Hand.R'] and path=='rotation'
  if keep:channels.append(c)
 used=sorted({c['sampler'] for c in channels});mapping={old:i for i,old in enumerate(used)};anim['samplers']=[anim['samplers'][i] for i in used]
 for c in channels:c['sampler']=mapping[c['sampler']]
 anim['channels']=channels
# Blender exports frame 1 at 1/fps; start every sampler at zero to avoid a hold at loops.
for index in {s['input'] for a in doc.get('animations',[]) for s in a['samplers']}:
 acc=doc['accessors'][index];view=doc['bufferViews'][acc['bufferView']];offset=8+view.get('byteOffset',0)+acc.get('byteOffset',0)
 times=list(struct.unpack_from('<'+'f'*acc['count'],binary,offset));start=times[0];times=[t-start for t in times]
 struct.pack_into('<'+'f'*len(times),binary,offset,*times);acc['min']=[min(times)];acc['max']=[max(times)]
# Equivalent q/-q rotations use one continuous hemisphere for auditable loop slopes.
for index in {a['samplers'][c['sampler']]['output'] for a in doc.get('animations',[]) for c in a['channels'] if c['target']['path']=='rotation'}:
 acc=doc['accessors'][index];view=doc['bufferViews'][acc['bufferView']];offset=8+view.get('byteOffset',0)+acc.get('byteOffset',0);previous=None
 for i in range(acc['count']):
  q=list(struct.unpack_from('<4f',binary,offset+i*16))
  if previous is not None and sum(a*b for a,b in zip(previous,q))<0:q=[-x for x in q]
  struct.pack_into('<4f',binary,offset+i*16,*q);previous=q
 acc.pop('min',None);acc.pop('max',None)
raw=json.dumps(doc,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
p.write_bytes(struct.pack('<III',0x46546c67,2,20+len(raw)+len(binary))+struct.pack('<II',len(raw),0x4e4f534a)+raw+binary)
import runpy
runpy.run_path(str(ROOT/'tools/guardian/batch_face.py'))['optimize'](p)
packed=p.read_bytes();doc=json.loads(packed[20:20+struct.unpack_from('<I',packed,12)[0]])
report={'bytes':p.stat().st_size,'bones':len(doc['skins'][0]['joints']),'animations':{a['name']:len(a['channels']) for a in doc['animations']},'primitives':sum(len(m['primitives']) for m in doc['meshes']),'sourceBytes':(ROOT/'art/guardian/original.glb').stat().st_size}
pathlib.Path(globals().get('guardian_metrics',ROOT/'docs/guardian/model-metrics.json')).write_text(json.dumps(report,indent=2)+'\n');print(report)
