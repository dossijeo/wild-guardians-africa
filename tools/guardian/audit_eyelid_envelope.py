"""Offline clearance audit of exported spherical eyelid morph interpolation.
Run with Blender --background --python this_file -- --input ... --report ...
--authoring ... . Does not replace moving-pose or runtime visual inspection.
"""
import argparse,json,sys
from pathlib import Path
import bpy
import numpy as np

p=argparse.ArgumentParser()
p.add_argument('--input',required=True);p.add_argument('--authoring',required=True)
p.add_argument('--report',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
meta=json.loads(Path(a.authoring).read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a.input)
obj=bpy.data.objects['ActorFacialLids'];keys=obj.data.shape_keys.key_blocks
base=np.array([list(obj.matrix_world@v.co) for v in keys['Basis'].data])
obj.data.calc_loop_triangles();triangles=np.array([list(t.vertices) for t in obj.data.loop_triangles])
results=[]
for side,sphere in meta['eyeSpheres'].items():
    center=np.array(sphere['center']);source_radius=sphere['radius']-.0015
    shapes=[base]+[np.array([list(obj.matrix_world@v.co) for v in keys['blink'+side+suffix].data]) for suffix in ['25','50','75','']]
    # Only the vertices belonging to this eye's corrective shapes.
    affected=np.linalg.norm(shapes[-1]-base,axis=1)>1e-7
    selected=triangles[np.all(affected[triangles],axis=1)]
    if not len(selected):raise RuntimeError('No affected eyelid triangles for '+side)
    minimum=float('inf');worst=None
    for step in range(101):
        value=step/100;segment=min(3,int(value*4));blend=value*4-segment
        points=shapes[segment]*(1-blend)+shapes[segment+1]*blend
        faces=points[selected]
        samples=np.concatenate([points[affected],faces.mean(axis=1),(faces[:,0]+faces[:,1])/2,(faces[:,1]+faces[:,2])/2,(faces[:,2]+faces[:,0])/2])
        clearance=float(np.min(np.linalg.norm(samples-center,axis=1))-source_radius)
        if clearance<minimum:minimum=clearance;worst=value
    results.append({'side':side,'minimumClearanceMeters':minimum,'worstBlink':worst,'triangles':len(selected),'steps':101,'pass':minimum>=0})
report={'input':a.input,'scope':'rest-space vertices, triangle centroids and edge midpoints against source eye sphere; not a visual or skinning test','eyes':results,'pass':all(r['pass'] for r in results)}
Path(a.report).write_text(json.dumps(report,indent=2));print(json.dumps(report))
if not report['pass']:raise RuntimeError('Eyelid interpolation penetrates source eye envelope')
