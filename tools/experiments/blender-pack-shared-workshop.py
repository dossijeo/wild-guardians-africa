"""Experimental one-atlas replacement for Mapungubwe; no source mutation."""
from pathlib import Path
import bpy, numpy as np, json, os
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/global-visual-lab/workshop-shared';OUT.mkdir(parents=True,exist_ok=True)
ASSETS=ROOT/'public/assets/visual-lab'
v=next(x for x in json.loads((ROOT/'public/content/villages.json').read_text()) if x['id']=='mapungubwe');u=v['units'][0]
path=ROOT/'public'/v['binary']['url'].lstrip('/')
a=np.fromfile(path,dtype='<f4',count=v['vertexBytes']//4).reshape(-1,8)
t=np.fromfile(path,dtype='<u4',offset=v['vertexBytes'],count=v['indexCount']).reshape(-1,3)
cb=ASSETS/'mapu-0-art.bin';n=(cb.stat().st_size-u['count']*4)//32
c=np.fromfile(cb,dtype='<f4',count=n*8).reshape(-1,8);ct=np.fromfile(cb,dtype='<u4',offset=n*32).reshape(-1,3)
raw=np.concatenate((a,c));indices=t.copy();indices[u['offset']//3:(u['offset']+u['count'])//3]=ct+len(a)
sourceuv=raw[indices,6:8].copy();sourcekind=(indices[:,0]>=len(a)).astype('uint8')
weight=float(os.environ.get('WG_SHARED_WORKSHOP_WEIGHT','.65'))
initial=sourceuv.copy();initial[sourcekind==1]*=weight;initial[sourcekind==1,:,0]+=2
# Weld only the authoring topology at equal position+UV. Runtime corners below
# retain their exact original positions/normals, including hard-normal seams.
positions=raw[indices,:3].reshape(-1,3)
keys=np.c_[np.round(positions,6),np.round(initial.reshape(-1,2),7)]
_,first,weld=np.unique(keys,axis=0,return_index=True,return_inverse=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('Shared atlas authoring topology');mesh.from_pydata(positions[first].tolist(),[],weld.reshape(-1,3).tolist());mesh.update()
obj=bpy.data.objects.new('Mapungubwe shared atlas',mesh);bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True)
uv=mesh.uv_layers.new(name='Shared packed colour')
uv.data.foreach_set('uv',initial.ravel())
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.pack_islands(rotate=True,scale=True,merge_overlap=True,margin_method='FRACTION',margin=.001,shape_method='CONCAVE')
bpy.ops.object.mode_set(mode='OBJECT')
packed=np.empty(len(mesh.loops)*2,dtype='float32');mesh.uv_layers.active.data.foreach_get('uv',packed);packed=packed.reshape(-1,3,2)
assert np.all(packed>=-.00001) and np.all(packed<=1.00001)
new=[];lookup={};newindices=[]
for old,uvp in zip(indices.ravel(),packed.reshape(-1,2)):
    key=(int(old),round(float(uvp[0]),7),round(float(uvp[1]),7))
    if key not in lookup:
        value=raw[old].copy();value[6:8]=uvp;lookup[key]=len(new);new.append(value)
    newindices.append(lookup[key])
new=np.asarray(new,dtype='<f4');newindices=np.asarray(newindices,dtype='<u4').reshape(-1,3)
assert np.array_equal(new[newindices,:6],a[t,:6])
(ASSETS/'mapungubwe-shared-art.bin').write_bytes(new.tobytes()+newindices.tobytes())
np.savez_compressed(OUT/'atlas-transfer.npz',sourceuv=sourceuv,targetuv=packed,sourcekind=sourcekind)
def density(world,mapped):
    world=world*16;mapped=mapped*2048
    area=np.linalg.norm(np.cross(world[:,1]-world[:,0],world[:,2]-world[:,0]),axis=1)*.5
    p=mapped[:,1]-mapped[:,0];q=mapped[:,2]-mapped[:,0];pixels=np.abs(p[:,0]*q[:,1]-p[:,1]*q[:,0])*.5
    valid=(area>1e-7)&(pixels>1e-7);d=np.sqrt(pixels[valid]/area[valid]);w=area[valid];order=np.argsort(d)
    return float(np.interp(.5,np.cumsum(w[order])/w.sum(),d[order]))
units=[]
for unit in v['units']:
    sl=slice(unit['offset']//3,(unit['offset']+unit['count'])//3);world=a[t[sl],:3]
    units.append({'key':unit['key'],'sourceDensity':density(world,a[t[sl],6:8]),'sharedDensity':density(world,packed[sl])})
report={'weight':weight,'size':[2048,2048],'vertices':len(new),'sourceVertices':len(a),'triangles':len(t),'positionNormalExactPerCorner':True,'units':units,'binaryBytes':(ASSETS/'mapungubwe-shared-art.bin').stat().st_size,'sourceColor':v['textures']['color']}
(OUT/'pack-audit.json').write_text(json.dumps(report,indent=2)+'\n',newline='\n');print(json.dumps(report,indent=2))
