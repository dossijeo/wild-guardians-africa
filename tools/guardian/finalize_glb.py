"""Remove Blender's constant full-rig channels so animation layers stay independent."""
import json,pathlib,struct
ROOT=pathlib.Path(__file__).resolve().parents[2]
p=ROOT/'public/content/guardian/guardian.glb';data=p.read_bytes();size=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+size]);binary=data[20+size:]
for anim in doc.get('animations',[]):
 channels=[]
 for c in anim['channels']:
  node=doc['nodes'][c['target']['node']].get('name','');path=c['target']['path']
  keep=node.startswith('Mantle.') and path=='translation' if anim['name'].startswith('Mantle_') else (node in ['Torso','Head','Shoulder.L','Shoulder.R','Arm.L','Arm.R','Forearm.L','Forearm.R'] and path=='rotation') or (node=='Root' and path=='translation')
  if keep:channels.append(c)
 used=sorted({c['sampler'] for c in channels});mapping={old:i for i,old in enumerate(used)};anim['samplers']=[anim['samplers'][i] for i in used]
 for c in channels:c['sampler']=mapping[c['sampler']]
 anim['channels']=channels
raw=json.dumps(doc,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
p.write_bytes(struct.pack('<III',0x46546c67,2,20+len(raw)+len(binary))+struct.pack('<II',len(raw),0x4e4f534a)+raw+binary)
report={'bytes':p.stat().st_size,'bones':len(doc['skins'][0]['joints']),'animations':{a['name']:len(a['channels']) for a in doc['animations']},'primitives':sum(len(m['primitives']) for m in doc['meshes']),'sourceBytes':(ROOT/'art/guardian/original.glb').stat().st_size}
(ROOT/'docs/guardian/model-metrics.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
