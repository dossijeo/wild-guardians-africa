"""Repair oral shell winding and add depth shading without extra draw calls."""
import argparse,sys,json
from pathlib import Path
import bpy,bmesh
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
obj=bpy.data.objects['LionOralAnatomy'];data=obj.data
original_positions=[tuple(v.co) for v in data.vertices]
original_morphs={k.name:[tuple(v.co) for v in k.data] for k in data.shape_keys.key_blocks}
bm=bmesh.new();bm.from_mesh(data)
def components():
    unseen=set(bm.verts);result=[]
    while unseen:
        seed=unseen.pop();group={seed};pending=[seed]
        while pending:
            v=pending.pop()
            for edge in v.link_edges:
                other=edge.other_vert(v)
                if other in unseen:unseen.remove(other);group.add(other);pending.append(other)
        faces={f for v in group for f in v.link_faces}
        volume=sum(f.verts[0].co.dot(f.verts[i].co.cross(f.verts[i+1].co))/6
            for f in faces for i in range(1,len(f.verts)-1))
        result.append({'vertices':len(group),'faces':len(faces),'signedVolume':volume,
            'closed':all(len(e.link_faces)==2 for v in group for e in v.link_edges)})
    return sorted(result,key=lambda x:-x['vertices'])
before=components()
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
after=components();bm.to_mesh(data);bm.free();data.update()
assert original_positions==[tuple(v.co) for v in data.vertices], 'Winding repair moved vertices'
assert original_morphs=={k.name:[tuple(v.co) for v in k.data] for k in data.shape_keys.key_blocks}, 'Winding repair changed morph coordinates'
assert len([c for c in after if c['closed']])==17, 'Expected tongue and sixteen closed teeth'
assert all(c['signedVolume']>0 for c in after if c['closed']), 'Closed oral shell still points inward'
# Ambient light in the game does not provide cavity occlusion. A continuous
# color falloff gives depth to existing tissue geometry, without a black cap.
colors=data.color_attributes['OralColor']
for poly in data.polygons:
    for li in poly.loop_indices:
        c=tuple(colors.data[li].color)
        if c[0]>.6:continue # Teeth retain their authored ivory palette.
        point=obj.matrix_world@data.vertices[data.loops[li].vertex_index].co
        depth=max(0,min(1,(point.y+.216)/.068))
        factor=.64*(1-.72*depth)
        colors.data[li].color=(c[0]*factor,c[1]*factor,c[2]*factor,1)
bs=data.materials[0].node_tree.nodes.get('Principled BSDF')
bs.inputs['Roughness'].default_value=.82;bs.inputs['Specular IOR Level'].default_value=.18
bpy.ops.wm.save_as_mainfile(filepath=str(Path(a.output).resolve()),compress=True)
bpy.ops.export_scene.gltf(filepath=str(Path(a.output).with_suffix('.glb').resolve()),
    export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',
    export_nla_strips=True,export_force_sampling=True,export_frame_range=False,
    export_yup=True,export_skins=True,export_all_influences=False,export_extras=True)
Path(a.output).with_suffix('.json').write_text(json.dumps({'before':before,'after':after,
    'positionsUnchanged':True,'morphCoordinatesUnchanged':True,
    'scope':'Oral geometry only; no claim of whole-actor visual acceptance'},indent=2),encoding='utf-8')
