"""Find exposed reverse faces with an offline depth rasterizer (selection only).

Geometric visibility does not verify textures, shadows, dynamic bridges or poses.
Even azimuths are selection; interleaved odd azimuths are withheld validation.
"""
import json,math,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor

out=ROOT/'docs/qa/frontside-model-pilot'
models=json.loads((out/'blender-inspection.json').read_text())['meshes']
receipts=json.loads((out/'candidate-receipts.json').read_text())
rows=[]
for model in models:
    receipt=next(r for r in receipts if r['source']==model['source'])
    _,doc,binary=read_glb(ROOT/'public'/model['source'].lstrip('/'))
    node=next(n for n in doc['nodes'] if n.get('name')==model['name']); prim=doc['meshes'][node['mesh']]['primitives'][0]
    p=accessor(doc,binary,prim['attributes']['POSITION']).astype(np.float64); ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
    _,candidate,bin2=read_glb(ROOT/receipt['candidate'])
    node2=next(n for n in candidate['nodes'] if n.get('name')==model['name']); prim2=candidate['meshes'][node2['mesh']]['primitives'][0]
    p2=accessor(candidate,bin2,prim2['attributes']['POSITION']).astype(np.float64); ix2=accessor(candidate,bin2,prim2['indices']).reshape(-1,3)
    center=(p.min(axis=0)+p.max(axis=0))*.5; radius=np.max(np.linalg.norm(p-center,axis=1)); scale=116/radius
    normals=np.cross(p2[ix2[:,1]]-p2[ix2[:,0]],p2[ix2[:,2]]-p2[ix2[:,0]])
    training=set(); validation=set(); samples=[]
    for elevation in [-15,5,25,55,85]:
        for az in range(32):
            theta=az*math.pi/16; el=math.radians(elevation)
            direction=np.array([math.sin(theta)*math.cos(el),math.sin(el),math.cos(theta)*math.cos(el)])
            right=np.cross([0,1,0],direction); right/=np.linalg.norm(right); up=np.cross(direction,right)
            q=(p-center)@np.stack([right,up,direction],axis=1); xy=q[:,:2]*np.array([scale,-scale])+128
            depth=np.full((256,256),-np.inf); faces=np.full((256,256),-1,dtype=np.int32)
            for face,ids in enumerate(ix):
                tri=xy[ids]; lo=np.maximum(0,np.floor(tri.min(axis=0)).astype(int)); hi=np.minimum(255,np.ceil(tri.max(axis=0)).astype(int))
                if np.any(hi<lo): continue
                a,b,c=tri; den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
                if abs(den)<1e-12: continue
                xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1)+.5,np.arange(lo[1],hi[1]+1)+.5)
                w0=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
                w1=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den; w2=1-w0-w1
                covered=(w0>=-1e-10)&(w1>=-1e-10)&(w2>=-1e-10)
                z=w0*q[ids[0],2]+w1*q[ids[1],2]+w2*q[ids[2],2]
                lane=depth[lo[1]:hi[1]+1,lo[0]:hi[0]+1]; face_lane=faces[lo[1]:hi[1]+1,lo[0]:hi[0]+1]
                closer=covered&(z>lane+1e-9); lane[closer]=z[closer]; face_lane[closer]=face
            visible,counts=np.unique(faces[faces>=0],return_counts=True)
            backs=visible[(normals[visible]@direction)<-1e-12]
            target=training if az%2==0 else validation; target.update(map(int,backs))
            samples.append(dict(azimuth=az*11.25,elevation=elevation,selection=az%2==0,
                exposedReverseFaces=len(backs),exposedReversePixels=int(sum(counts[(normals[visible]@direction)<-1e-12]))))
    rows.append(dict(name=model['name'],category=model['category'],source=model['source'],
        selectionFaces=sorted(training),withheldAdditionalFaces=sorted(validation-training),
        selectionTriangleGrowthPercent=100*len(training)/len(ix),
        withheldTriangleGrowthPercent=100*len(training|validation)/len(ix),samples=samples))
    print(json.dumps(dict(name=model['name'],selected=len(training),withheldAdditional=len(validation-training),growthPercent=100*len(training|validation)/len(ix))),flush=True)
(out/'selective-reverse-probe.json').write_text(json.dumps(dict(status='SELECTION_ONLY_NOT_APPROVED',resolution=256,viewsPerMesh=160,
    limitations='Local rest pose only. Future validation must independently sample 1024px real shaders, crop bridges, animation poses, shadows, day/night and world surroundings.',meshes=rows),indent=2)+'\n')
