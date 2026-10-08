"""Disabled partial candidate, original geometry/rig; strict closed rigid subset."""
import copy,hashlib,json,struct,sys
sys.dont_write_bytecode=True
from frontside_model_pilot import ROOT,read_glb
folder=ROOT/'docs/qa/frontside-model-pilot';audit=json.loads((folder/'worker-exact-closed-component-filter.json').read_text(encoding='utf8'))
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='youngMale');raw,d,b=read_glb(ROOT/'public'/receipt['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==audit['sourceSha256']==receipt['sourceSha256']
out=copy.deepcopy(d);selected=[];material_remap={}
for row in audit['meshes']:
    if not(row['eligibleTriangles']==row['triangles'] and row['sourceDoubleSided'] and row['skin'] is None and row['morphTargetCount']==0 and row['materialAlphaMode']=='OPAQUE'):continue
    node=next(n for n in d['nodes'] if n.get('name')==row['mesh']);p=out['meshes'][node['mesh']]['primitives'][row['primitive']];old=p['material'];assert d['materials'][old]['doubleSided']
    if old not in material_remap:
        material=copy.deepcopy(d['materials'][old]);material['doubleSided']=False;out['materials'].append(material);material_remap[old]=len(out['materials'])-1
    p['material']=material_remap[old];selected.append(dict(mesh=row['mesh'],primitive=row['primitive'],triangles=row['triangles'],sourceMaterial=old,candidateMaterial=p['material']))
assert len(selected)==5 and sum(r['triangles'] for r in selected)==8640
text=json.dumps(out,separators=(',',':')).encode();text+=b' '*(-len(text)%4);blob=b+b'\0'*(-len(b)%4);candidate=struct.pack('<III',0x46546c67,2,28+len(text)+len(blob))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(blob),0x004e4942)+blob
sha=hashlib.sha256(candidate).hexdigest();archive=ROOT/'.cache/frontside-model-pilot/candidates/archive'/(sha+'.glb')
if archive.exists():assert archive.read_bytes()==candidate
else:archive.write_bytes(candidate)
_,verified,vb=read_glb(archive);assert vb==blob
for k in ['accessors','bufferViews','nodes','skins','animations','images','textures']:assert verified.get(k)==d.get(k)
assert verified['materials'][:len(d['materials'])]==d['materials']
for mi,m in enumerate(d['meshes']):
    for pi,p in enumerate(m['primitives']):
        v=copy.deepcopy(verified['meshes'][mi]['primitives'][pi]);v['material']=p['material'];assert v==p
r=dict(category='youngMale',source=receipt['source'],candidate=str(archive.relative_to(ROOT)).replace('\\','/'),archiveCandidate=str(archive.relative_to(ROOT)).replace('\\','/'),candidateSha256=sha)
report=dict(status='CLOSED_RIGID_SUBSET_CANDIDATE_NOT_APPROVED',sourceSha256=receipt['sourceSha256'],componentAuditSha256=hashlib.sha256((folder/'worker-exact-closed-component-filter.json').read_bytes()).hexdigest(),candidate=r,selected=selected,newMaterialCount=len(material_remap),verifiedClips=len(d['animations']),geometryBytesAndIndexOrderUnchanged=True,limitations=['Partial material-sidedness adaptation; bodyMesh0 alreadyFrontSide and remaining accessories stay originalDoubleSide.', 'Only source material clones differ by doubleSided=false; original materials/UV/maps/geometry/rig/skin/12clips bytes retained.', 'Native opt-in must preserve sourceDOUBLE_SIDED normal/TBN recipe on selected parts. Closedness is a filter, not all-view/shadow/GPU approval.', 'No added triangles/groups/draw calls; shader/material GPU memory and actual draw cost remain to measure.', 'Source undefined normals in nonselected parts remain unchanged and unapproved; no category normal repair claimed.'])
(folder/'worker-closed-subset-candidate-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');(folder/'worker-closed-subset-candidate-receipts.json').write_text(json.dumps([r],indent=2)+'\n',encoding='utf8');print(json.dumps(report))
