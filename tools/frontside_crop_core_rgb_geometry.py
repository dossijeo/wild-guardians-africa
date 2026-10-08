"""Read-only geometry ownership of one guided original RGB diagnostic.

faceLabels are regional driver IDs, not a closedness or physical-ground proof.
No topology, shader, material, bridge mapping or asset is changed.
"""
import hashlib,json,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
folder=ROOT/'docs/qa/frontside-model-pilot'
capture=json.loads((folder/'maize-core-front-source-rgb-guided-diagnostic.json').read_text())
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='crops')
raw,doc,bin=read_glb(ROOT/'public'/receipt['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text());rows=[]
for ownership in capture['sourceRgbFaceProvenance']['faces']:
 node=next(n for n in doc['nodes'] if n.get('name')==ownership['mesh']);prim=doc['meshes'][node['mesh']]['primitives'][0]
 p=accessor(doc,bin,prim['attributes']['POSITION']);n=accessor(doc,bin,prim['attributes']['NORMAL']);uv=accessor(doc,bin,prim['attributes']['TEXCOORD_0']);ix=accessor(doc,bin,prim['indices']).reshape(-1,3)
 face=ownership['sourceFace'];ids=ix[face];meta=node['extras'];model=meta['cropIndex']*5+meta['stage']-1;label=bridges['models'][model]['faceLabels'][face]
 assert face==ownership['face'] and label==ownership['faceLabel']
 positions=p[ids];cross=np.cross(positions[1]-positions[0],positions[2]-positions[0]);defined=n[ids].astype(np.float64)
 rows.append(dict(mesh=ownership['mesh'],face=face,faceLabel=label,driverRegion=bridges['models'][model]['regions'][label],backFacing=ownership['backFacing'],pixels=ownership['pixels'],sourceVertexIds=ids.tolist(),positions=positions.tolist(),normals=n[ids].tolist(),uv=uv[ids].tolist(),centroid=positions.mean(0).tolist(),minY=float(positions[:,1].min()),maxY=float(positions[:,1].max()),area=float(np.linalg.norm(cross)*.5),faceNormalDotMeanAuthoredNormal=float(np.dot(cross,defined.mean(0)))))
report=dict(status='GUIDED_SOURCE_GEOMETRY_OWNERSHIP_NOT_APPROVAL',sourceSha256=receipt['sourceSha256'],captureSha256=hashlib.sha256((folder/'maize-core-front-source-rgb-guided-diagnostic.json').read_bytes()).hexdigest(),faces=rows,originalBackFaces=sum(r['backFacing'] for r in rows),nominalRgbPixels=sum(r['pixels'] for r in rows),label0FaceYRange=[min(r['minY'] for r in rows if r['faceLabel']==0),max(r['maxY'] for r in rows if r['faceLabel']==0)],limitations=['Later diagnostic IDs joined to original saved nominal RGB mask, not causal proof or visual acceptance.', 'Regional driver0 may own faces above soil; driver labels alone do not certify ground, closedness, thinness or Front compatibility.', 'Original normals/index winding agree where dot is positive; this does not establish outward volume orientation.', 'No candidate selection, geometry changes or bridge relabelling.'])
(folder/'maize-core-front-source-rgb-geometry.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['originalBackFaces','nominalRgbPixels','label0FaceYRange']}))
