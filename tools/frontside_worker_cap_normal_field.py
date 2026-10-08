"""One disabled Badge5 derived cap preserving the authored smooth normal field.

Coplanar radial/angular tessellation retains the original affine UV/position
domain. Valid unit corner normals approximate normalized original interpolation;
no shader restores zero normals. All other worker geometry/rig/clips stay exact.
This is training construction, never visual/shadow/GPU acceptance.
"""
import copy,hashlib,json,struct,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor

folder=ROOT/'docs/qa/frontside-model-pilot'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='youngMale')
source,sd,sb=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
base,bd,bb=read_glb(ROOT/receipt['archiveCandidate'])
assert hashlib.sha256(source).hexdigest()==receipt['sourceSha256'] and hashlib.sha256(base).hexdigest()==receipt['candidateSha256']
name='Can_badge_geometry_5';node=next(n for n in bd['nodes'] if n.get('name')==name)
assert 'skin' not in node
prim=bd['meshes'][node['mesh']]['primitives'][0]
assert not prim.get('targets') and set(prim['attributes'])=={'POSITION','NORMAL','TEXCOORD_0'}
attrs={k:accessor(bd,bb,a) for k,a in prim['attributes'].items()}
p,n,uv=(attrs[k] for k in ['POSITION','NORMAL','TEXCOORD_0']);ix=accessor(bd,bb,prim['indices']).reshape(-1,3)
zero=np.linalg.norm(n.astype(np.float64),axis=1)<1e-10
affected=np.flatnonzero(np.any(zero[ix],axis=1));assert np.array_equal(affected,np.arange(32))
# Predetermined training family. The central disc has r^2=4e-6 of original
# cap area, approximately .018px at the guided closeup; this is not a raster bound.
radii=[.002,.004,.008,.016,.032,.064,.128,.256,.512,1.]
angular=6;positions=p.tolist();normals=n.tolist();uvs=uv.tolist();faces=[];ancestry=[];rows=[];max_error=0.
unit=lambda v:v/np.linalg.norm(v)
samples=[[1/3]*3,[.6,.2,.2],[.2,.6,.2],[.2,.2,.6],[.45,.45,.1],[.45,.1,.45],[.1,.45,.45]]
for face,indices in enumerate(ix):
 if face not in affected:
  faces.append(indices.tolist());ancestry.append(face);continue
 pts=p[indices].astype(np.float64)
 if np.array_equal(pts[0],pts[1]) or np.array_equal(pts[0],pts[2]) or np.array_equal(pts[1],pts[2]):
  rows.append(dict(sourceFace=face,kind='EXACT_REPEATED_POSITION_ZERO_AREA_REMOVED'));continue
 zeros=np.flatnonzero(zero[indices]);assert len(zeros)==1
 # Cyclic permutation retains the exact original winding.
 ids=np.roll(indices,-int(zeros[0]));a,b,c=map(int,ids)
 assert np.linalg.norm(n[b])>.99 and np.linalg.norm(n[c])>.99
 nb,nc=unit(n[b].astype(np.float64)),unit(n[c].astype(np.float64));assert np.dot(nb,nc)>0
 local=[];params={}
 def vertex(r,s,center=False):
  position=(1-r)*p[a]+r*((1-s)*p[b]+s*p[c]);texture=(1-r)*uv[a]+r*((1-s)*uv[b]+s*uv[c])
  normal=unit((1-s)*nb+s*nc)
  if r==1 and s==0:v=b
  elif r==1 and s==1:v=c
  else:
   v=len(positions);positions.append(np.asarray(position,np.float32).tolist());normals.append(np.asarray(normal,np.float32).tolist());uvs.append(np.asarray(texture,np.float32).tolist())
  params[v]=(r,s);return v
 rings=[[vertex(r,j/angular) for j in range(angular+1)] for r in radii]
 for j in range(angular):local.append([vertex(0,(j+.5)/angular,True),rings[0][j],rings[0][j+1]])
 for lo,hi in zip(rings,rings[1:]):
  for j in range(angular):local.extend([[lo[j],hi[j],hi[j+1]],[lo[j],hi[j+1],lo[j+1]]])
 errors=[]
 for triangle in local:
  # Verify positive original face orientation in real float32 positions.
  tp=np.asarray([positions[v] for v in triangle],np.float64)
  assert np.dot(np.cross(tp[1]-tp[0],tp[2]-tp[0]),np.cross(p[b]-p[a],p[c]-p[a]))>0
  if all(params[v][0]<=radii[0] for v in triangle):continue
  vn=np.asarray([unit(np.asarray(normals[v],np.float64)) for v in triangle])
  for weights in samples:
   radius=sum(w*params[v][0] for w,v in zip(weights,triangle))
   angle=sum(w*params[v][0]*params[v][1] for w,v in zip(weights,triangle))/radius
   expected=unit((1-angle)*nb+angle*nc);actual=unit(np.asarray(weights)@vn)
   error=float(np.linalg.norm(actual-expected));errors.append(error);max_error=max(max_error,error)
 faces.extend(local);ancestry.extend([face]*len(local));rows.append(dict(sourceFace=face,kind='COPLANAR_UNIT_NORMAL_FIELD_REMESH',newFaces=len(local),sampledNormalChordError=max(errors),sourceDefinedRimNormalAngleDegrees=float(np.degrees(np.arccos(np.clip(np.dot(nb,nc),-1,1))))))
values={'POSITION':np.asarray(positions,np.float32),'NORMAL':np.asarray(normals,np.float32),'TEXCOORD_0':np.asarray(uvs,np.float32)}
indices=np.asarray(faces,np.int64);retained=np.unique(indices.reshape(-1));new_index=np.searchsorted(retained,indices)
values={k:v[retained] for k,v in values.items()}
assert np.isfinite(values['NORMAL']).all() and np.all(np.abs(np.linalg.norm(values['NORMAL'],axis=1)-1)<1e-4)
old_retained=retained[retained<len(p)];assert not zero[old_retained].any()
for semantic in attrs:assert values[semantic][:len(old_retained)].tobytes()==attrs[semantic][old_retained].tobytes()
doc=copy.deepcopy(bd);outprim=doc['meshes'][node['mesh']]['primitives'][0];blob=bytearray(bb)
def append(array,template,target):
 blob.extend(b'\0'*(-len(blob)%4));offset=len(blob);blob.extend(array.tobytes());doc['bufferViews'].append(dict(buffer=0,byteOffset=offset,byteLength=array.nbytes,target=target))
 a=copy.deepcopy(template);a['bufferView']=len(doc['bufferViews'])-1;a.pop('byteOffset',None);a['count']=len(array)
 if 'min' in a:a['min']=array.min(0).tolist()
 if 'max' in a:a['max']=array.max(0).tolist()
 doc['accessors'].append(a);return len(doc['accessors'])-1
for semantic,aid in list(outprim['attributes'].items()):outprim['attributes'][semantic]=append(values[semantic],doc['accessors'][aid],34962)
aid=outprim['indices'];assert new_index.max()<65536
index_values=new_index.reshape(-1,1).astype('<u2');index_template=copy.deepcopy(doc['accessors'][aid]);index_template['componentType']=5123
outprim['indices']=append(index_values,index_template,34963)
doc['buffers'][0]['byteLength']=len(blob)
for key in ['nodes','skins','animations','materials','images']:assert doc.get(key)==bd.get(key)
text=json.dumps(doc,separators=(',',':')).encode();text+=b' '*(-len(text)%4);blob.extend(b'\0'*(-len(blob)%4))
raw=struct.pack('<III',0x46546c67,2,28+len(text)+len(blob))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(blob),0x004e4942)+blob
sha=hashlib.sha256(raw).hexdigest();archive=ROOT/'.cache/frontside-model-pilot/candidates/archive'/(sha+'.glb');archive.write_bytes(raw)
_,verified,vb=read_glb(archive)
sampler_bytes=0
for m,mesh in enumerate(bd['meshes']):
 for j,bp in enumerate(mesh['primitives']):
  vp=verified['meshes'][m]['primitives'][j]
  if m==node['mesh']:
   for semantic in values:assert accessor(verified,vb,vp['attributes'][semantic]).tobytes()==values[semantic].tobytes()
   assert np.array_equal(accessor(verified,vb,vp['indices']).reshape(-1,3),new_index)
  else:
   for semantic,aid in bp['attributes'].items():assert accessor(bd,bb,aid).tobytes()==accessor(verified,vb,vp['attributes'][semantic]).tobytes()
   assert accessor(bd,bb,bp['indices']).tobytes()==accessor(verified,vb,vp['indices']).tobytes()
for i,animation in enumerate(bd['animations']):
 for j,sampler in enumerate(animation['samplers']):
  for lane in ['input','output']:
   old=accessor(bd,bb,sampler[lane]);new=accessor(verified,vb,verified['animations'][i]['samplers'][j][lane]);assert old.tobytes()==new.tobytes();sampler_bytes+=old.nbytes
for i,skin in enumerate(bd['skins']):
 if 'inverseBindMatrices' in skin:assert accessor(bd,bb,skin['inverseBindMatrices']).tobytes()==accessor(verified,vb,verified['skins'][i]['inverseBindMatrices']).tobytes()
geometry_delta=sum(v.nbytes for v in values.values())+index_values.nbytes-sum(v.nbytes for v in attrs.values())-accessor(bd,bb,prim['indices']).nbytes
def geometry_totals(d,b):
 bytes_count=triangles=0
 for mesh in d['meshes']:
  for primitive in mesh['primitives']:
   for aid in primitive['attributes'].values():bytes_count+=accessor(d,b,aid).nbytes
   indices=accessor(d,b,primitive['indices']);bytes_count+=indices.nbytes;triangles+=indices.size//3
 return bytes_count,triangles
source_bytes,source_triangles=geometry_totals(sd,sb);candidate_bytes,candidate_triangles=geometry_totals(verified,vb)
candidate=dict(category='youngMale',mesh=name,source=receipt['source'],candidate=str(archive.relative_to(ROOT)).replace('\\','/'),candidateSha256=sha,archiveCandidate=str(archive.relative_to(ROOT)).replace('\\','/'),verifiedAnimationSamplerBytes=sampler_bytes,verifiedClipCount=len(bd['animations']))
report=dict(status='CAP_UNIT_NORMAL_FIELD_DERIVED_NOT_APPROVED',sourceSha256=receipt['sourceSha256'],baseCandidateSha256=receipt['candidateSha256'],candidate=candidate,radii=radii,angularSubdivisions=angular,sourceVertices=len(p),candidateVertices=len(retained),sourceFaces=len(ix),candidateFaces=len(indices),geometryDeltaBytes=geometry_delta,triangleDelta=len(indices)-len(ix),sampledNormalChordError=max_error,centralAreaFraction=radii[0]**2,accessories=[dict(mesh=name,retainedBaseCandidateFaces=ancestry)],sourceFaceDetails=rows,limitations=['New unit normals approximate authored interpolated shading field, not geometric flat recalc. Original defined corner normals/UV retained.', 'CPU chord errors are sampled in the local rigid frame, excluding central disc; not raster/map bounds or all-pose normalMatrix validation.', 'All new positions/UV are affine samples of original cap triangles; Float32 subdivision can still change raster/depth and needs native gates.', 'All other mesh attribute/index bytes and12clips/skins/inverse-bind/nodes/materials/images verified unchanged. No activation, GPU benefit or acceptance.'])
report['resources']=dict(sourceWorkerTriangles=source_triangles,candidateWorkerTriangles=candidate_triangles,triangleChangePercent=100*(candidate_triangles/source_triangles-1),sourceWorkerGeometryBytes=source_bytes,candidateWorkerGeometryBytes=candidate_bytes,geometryChangePercent=100*(candidate_bytes/source_bytes-1),capIndexComponentType=5123,meaning='Referenced decoded attribute/index bytes only, not measured complete GPU memory or invocations. Uint16 cap indices preserve numeric corner order.')
(folder/'worker-badge-field-normal-export-audit.json').write_text(json.dumps(report,indent=2)+'\n')
(folder/'worker-badge-field-normal-candidate-receipts.json').write_text(json.dumps([candidate],indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['candidate','sourceVertices','candidateVertices','sourceFaces','candidateFaces','geometryDeltaBytes','triangleDelta','sampledNormalChordError','centralAreaFraction']}))
