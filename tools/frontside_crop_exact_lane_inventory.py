"""Read-only exact corner equivalence, retaining driver labels and face order.

No tolerance weld, geometry export, topology repair or acceptance. Equivalent
corners must have every source attribute byte identical and one faceLabel.
Multiple old source vertices may map to one row, but per-face corner provenance
must remain available in any future writer/bridge reconstruction.
"""
import hashlib,json,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor

folder=ROOT/'docs/qa/frontside-model-pilot';data=json.loads((ROOT/'public/content/crop-bridges.json').read_text())
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/receipt['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
rows=[]
for name in ['maiz_03_adulto','maiz_04_desarrollo','maiz_05_maduro','platano_05_maduro']:
 node=next(n for n in doc['nodes'] if n.get('name')==name);prim=doc['meshes'][node['mesh']]['primitives'][0]
 assert not prim.get('targets') and 'skin' not in node
 attrs={key:accessor(doc,binary,aid) for key,aid in sorted(prim['attributes'].items())};ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
 model=node['extras']['cropIndex']*5+node['extras']['stage']-1;labels=data['models'][model]['faceLabels'];assert len(labels)==len(ix)
 table={};state_table={};state_vertices=[];state_index=np.zeros_like(ix);old_vertices=[];new_index=np.zeros_like(ix);identity_table=set()
 for face,triangle in enumerate(ix):
  for corner,old in enumerate(triangle):
   state_key=tuple(values[old].tobytes() for values in attrs.values());key=(labels[face],*state_key);identity_table.add((labels[face],int(old)))
   if state_key not in state_table:state_table[state_key]=len(state_vertices);state_vertices.append(int(old))
   state_index[face,corner]=state_table[state_key]
   if key not in table:table[key]=len(old_vertices);old_vertices.append(int(old))
   new_index[face,corner]=table[key]
 retained=np.array(old_vertices,dtype=np.int64)
 for semantic,values in attrs.items():
  assert values[ix].tobytes()==values[retained][new_index].tobytes(),semantic
  assert values[ix].tobytes()==values[state_vertices][state_index].tobytes(),semantic
 lane_bytes=sum(values.dtype.itemsize*values.shape[1] for values in attrs.values());index_width=2 if len(retained)<=65535 else 4
 original_bytes=sum(values.nbytes for values in attrs.values())+ix.nbytes;new_bytes=len(retained)*lane_bytes+ix.size*index_width
 state_bytes=len(state_vertices)*lane_bytes+ix.size*(2 if len(state_vertices)<=65535 else 4)
 rows.append(dict(mesh=name,triangles=len(ix),sourceVertices=len(next(iter(attrs.values()))),sourceIdentityAndDriverVertices=len(identity_table),exactEquivalentVertices=len(retained),sourceGeometryBytes=original_bytes,driverExpandedGeometryBytes=new_bytes,driverExpandedBytesChangePercent=100*(new_bytes/original_bytes-1),stateAttributeOnlyVertices=len(state_vertices),stateAttributeOnlyGeometryBytes=state_bytes,stateAttributeOnlyBytesChangePercent=100*(state_bytes/original_bytes-1),newTriangles=0,
  limitations=['State-only equivalence ignores face labels because original state attributes do not contain organ drivers; per-face labels remain unchanged.', 'Driver-strict logical inventory splits shared state vertices by label; actual22-lane bridge attributes and role must also match before bridge sharing.', 'No source face/corner reordered; UV/normal equivalence verified byte-for-byte. Indexing/cache benefit needs runtime measurement.']))
out=dict(status='EXACT_LANE_COST_DIAGNOSIS_NOT_APPROVAL',sourceSha256=receipt['sourceSha256'],meshes=rows,limitations=['No source/candidate asset or faceLabels changed.', 'This is indexing, not FrontSide repair; required thin-surface backs remain a separate problem.', 'No threshold changed and no GPU/performance conclusion.'])
(folder/'crop-exact-lane-inventory.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(rows))
