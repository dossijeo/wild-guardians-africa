"""Measure edge-length error of the 16 authored lion teeth across mouth morph."""
import argparse,json,sys
from pathlib import Path
import bpy
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);p.add_argument('--check',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
obj=bpy.data.objects['LionOralAnatomy'];mesh=obj.data
neighbors=[set() for v in mesh.vertices]
for edge in mesh.edges:
    i,j=edge.vertices;neighbors[i].add(j);neighbors[j].add(i)
seen=set();teeth=[]
for seed in range(len(neighbors)):
    if seed in seen:continue
    stack=[seed];seen.add(seed);component=set()
    while stack:
        i=stack.pop();component.add(i)
        for j in neighbors[i]-seen:seen.add(j);stack.append(j)
    if len(component)==40:teeth.append(component)
assert len(teeth)==16,'Unexpected oral topology; revise explicit tooth selection'
basis=mesh.shape_keys.key_blocks['Basis'];opened=mesh.shape_keys.key_blocks['mouthOpen']
report={'input':a.input,'teeth':len(teeth),'samples':[]}
for amount in [0,.25,.5,.75,1]:
    maximum=0;per_tooth=[]
    for tooth in teeth:
        worst=0
        for edge in mesh.edges:
            i,j=edge.vertices
            if i not in tooth or j not in tooth:continue
            # Transform points, not directions, to include nonuniform scales.
            b0=obj.matrix_world@basis.data[i].co;b1=obj.matrix_world@basis.data[j].co
            p0=obj.matrix_world@basis.data[i].co.lerp(opened.data[i].co,amount)
            p1=obj.matrix_world@basis.data[j].co.lerp(opened.data[j].co,amount)
            base=(b0-b1).length
            if base>1e-8:worst=max(worst,abs((p0-p1).length/base-1))
        per_tooth.append(worst);maximum=max(maximum,worst)
    report['samples'].append({'amount':amount,'maxRelativeEdgeError':maximum,'perTooth':per_tooth})
Path(a.output).write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
if a.check:
    # Submillimeter edges in float32 positions around 1.5 m have visible
    # relative quantization error; 0.1% is distinct from the prior 16% warp.
    assert report['samples'][-1]['maxRelativeEdgeError']<.001,'Full-open teeth are deformed'
    assert max(row['maxRelativeEdgeError'] for row in report['samples'])<.021,'Interpolation exceeds expected 0.4-radian morph contraction'
