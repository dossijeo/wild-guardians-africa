"""Offline multi-view rejection screen, not real-shader acceptance or GPU evidence.

Pillow integer polygon coverage at 512px detects gross FrontSide silhouette loss.
No light, depth, shadows, pose, skin or shader claim is made. Nonzero failures
are sufficient to reject these winding-only candidates, never to approve them.
"""
import json, math, sys
sys.dont_write_bytecode=True
import numpy as np
from PIL import Image,ImageDraw
from frontside_model_pilot import ROOT,read_glb,accessor

out=ROOT/'docs/qa/frontside-model-pilot'
inspection=json.loads((out/'blender-inspection.json').read_text())
receipts=json.loads((out/'candidate-receipts.json').read_text())
rows=[]
for model in inspection['meshes']:
    receipt=next(r for r in receipts if r['source']==model['source'])
    _,doc,binary=read_glb(ROOT/'public'/model['source'].lstrip('/'))
    node=next(n for n in doc['nodes'] if n.get('name')==model['name'])
    primitive=doc['meshes'][node['mesh']]['primitives'][0]
    p=accessor(doc,binary,primitive['attributes']['POSITION']).astype(np.float64)
    ix=accessor(doc,binary,primitive['indices']).reshape(-1,3)
    _,candidate,bin2=read_glb(ROOT/receipt['candidate'])
    node2=next(n for n in candidate['nodes'] if n.get('name')==model['name'])
    prim2=candidate['meshes'][node2['mesh']]['primitives'][0]
    p2=accessor(candidate,bin2,prim2['attributes']['POSITION']).astype(np.float64)
    ix2=accessor(candidate,bin2,prim2['indices']).reshape(-1,3)
    center=(p.min(axis=0)+p.max(axis=0))*.5
    radius=np.max(np.linalg.norm(p-center,axis=1)); scale=235/max(radius,1e-6)
    sheet=Image.new('RGB',(8*256,6*256),'#101820')
    for level,elevation in enumerate([-15,25,85]):
        for az in range(16):
            theta=az*math.pi/8; el=math.radians(elevation)
            direction=np.array([math.sin(theta)*math.cos(el),math.sin(el),math.cos(theta)*math.cos(el)])
            right=np.cross([0,1,0],direction); right/=np.linalg.norm(right)
            up=np.cross(direction,right)
            def mask(points,index,cull):
                q=(points-center)@np.stack([right,up,direction],axis=1)
                xy=q[:,:2]*np.array([scale,-scale])+256
                image=Image.new('L',(512,512)); draw=ImageDraw.Draw(image)
                crosses=np.cross(points[index[:,1]]-points[index[:,0]],points[index[:,2]]-points[index[:,0]])
                visible=(crosses@direction)>0 if cull else np.ones(len(index),dtype=bool)
                # Canonical corner order removes Pillow traversal-direction noise
                # in equivalent original/candidate triangles. For three corners,
                # every permutation describes the same triangular region.
                for ids in index[visible]: draw.polygon(sorted(tuple(x) for x in xy[ids]),fill=255)
                return np.asarray(image)>0
            original=mask(p,ix,False); repaired=mask(p2,ix2,True)
            double_control=mask(p2,ix2,False)
            unmodified_front=mask(p,ix,True)
            missing=original&~repaired; added=repaired&~original
            union=np.sum(original|repaired); intersection=np.sum(original&repaired)
            row=dict(name=model['name'],azimuth=az*22.5,elevation=elevation,
                originalPixels=int(original.sum()),missingPixels=int(missing.sum()),addedPixels=int(added.sum()),
                alphaIoU=float(intersection/max(union,1)),missingFraction=float(missing.sum()/max(original.sum(),1)),
                identicalGeometryDoubleSideControlDifferentPixels=int(np.sum(original!=double_control)),
                unmodifiedFrontSideMissingPixels=int(np.sum(original&~unmodified_front)))
            unseen=set(zip(*np.where(missing))); regions=[]
            while unseen:
                seed=unseen.pop(); pending=[seed]; component=[seed]
                while pending:
                    y,x=pending.pop()
                    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:
                        point=(y+dy,x+dx)
                        if point in unseen: unseen.remove(point); pending.append(point); component.append(point)
                regions.append(component)
            row['largestMissingConnectedPixels']=max(map(len,regions),default=0)
            row['largestMissingRegionBoundingDiameter']=max((math.hypot(max(y for y,x in c)-min(y for y,x in c),max(x for y,x in c)-min(x for y,x in c)) for c in regions),default=0)
            row['passesSilhouetteThresholdOnly']=row['alphaIoU']>=.9995 and row['missingFraction']<=.00025
            rows.append(row)
            rgb=np.zeros((512,512,3),dtype=np.uint8); rgb[original]=[190,215,190]; rgb[missing]=[255,40,45]; rgb[added]=[30,150,255]
            tile=Image.fromarray(rgb).resize((256,256)); ImageDraw.Draw(tile).text((5,5),f'{az*22.5:g}/{elevation} IoU{row["alphaIoU"]:.4f}',fill='white')
            sheet.paste(tile,((az%8)*256,(level*2+az//8)*256))
    sheet.save(out/(model['name']+'-silhouette-rejection.png'))
report=dict(status='REJECTED_WINDING_ONLY_CANDIDATES',resolution=512,viewsPerMesh=48,
    limitations='CPU orthographic local rest-pose binary coverage only; no real shaders, maps, shadows, animations or GPU timing. A pass here cannot approve a candidate.',
    samples=rows)
(out/'silhouette-rejection.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps([dict(name=n,failed=sum(not r['passesSilhouetteThresholdOnly'] for r in rows if r['name']==n),worstIoU=min(r['alphaIoU'] for r in rows if r['name']==n),worstMissingFraction=max(r['missingFraction'] for r in rows if r['name']==n)) for n in dict.fromkeys(r['name'] for r in rows)]))
