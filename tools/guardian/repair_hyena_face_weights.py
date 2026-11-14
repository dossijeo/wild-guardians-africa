"""Keep the complete muzzle on Head, blending only behind/below the jaw.

The imported preparation used a horizontal head-weight threshold through the
muzzle. Its upper half followed Head while the lower half retained neck and
shoulder weights. Do not modify geometry, UVs, morphs, clips or necklace parts.
"""
import argparse,json,sys
from pathlib import Path
import bpy

def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)))
    return t*t*(3-2*t)

def repair(mesh):
    tag=mesh.data.attributes.get('bodySurface')
    assert tag and tag.domain=='FACE','Requires the audited dental body selection'
    body={i for f in mesh.data.polygons if tag.data[f.index].value for i in f.vertices}
    dental_tag=mesh.data.attributes.get('rigidDentalIsland')
    assert dental_tag,'Requires the audited dental islands'
    dental={i for f in mesh.data.polygons if dental_tag.data[f.index].value for i in f.vertices}
    head=mesh.vertex_groups['Head']
    changed=[]
    for v in mesh.data.vertices:
        if v.index not in body and v.index not in dental:continue
        x,y,z=mesh.matrix_world@v.co
        amount=smooth(1.15,1.26,z)*(1-smooth(-.55,-.40,y))*(1-smooth(.28,.36,abs(x)))
        if v.index in dental:amount=1
        weights={g.group:g.weight for g in v.groups}
        if amount<=0 or weights.get(head.index,0)>.999999:continue
        result={index:weight*(1-amount) for index,weight in weights.items() if index!=head.index}
        result[head.index]=amount+(1-amount)*weights.get(head.index,0)
        selected=sorted(result.items(),key=lambda item:item[1],reverse=True)[:4]
        total=sum(weight for _,weight in selected)
        for index in weights:mesh.vertex_groups[index].remove([v.index])
        for index,weight in selected:
            if weight>1e-7:mesh.vertex_groups[index].add([v.index],weight/total,'REPLACE')
        changed.append(v.index)
    return {'changedVertices':len(changed),'selection':'bodySurface and audited dental islands; complete muzzle rigid, smooth posterior/inferior transition','geometryChanged':False,'collarChanged':False}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True)
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
    bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
    result=repair(bpy.data.objects['Mesh_0'])
    result.update(input=a.input,output=a.output)
    bpy.ops.wm.save_as_mainfile(filepath=str(Path(a.output).resolve()),compress=True)
    bpy.ops.export_scene.gltf(filepath=str(Path(a.output).with_suffix('.glb').resolve()),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True)
    Path(a.output).with_suffix('.weights.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
