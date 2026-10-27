"""Localized material projection of generated fur repair, prior to final UV bake.
The actual canine is excluded by connected-component membership. Only source
body skin is painted. This Blender authoring material must be baked for glTF.
"""
import bpy,bmesh,math
from mathutils import Vector
from pathlib import Path

def apply_muzzle_patch(mesh, image_path):
    world=mesh.matrix_world.copy(); original_uv=mesh.data.uv_layers[0].name
    original_uv_values=[tuple(loop.uv) for loop in mesh.data.uv_layers[0].data]
    # Original source uses a separate right canine; do not recolor its ivory.
    bm=bmesh.new();bm.from_mesh(mesh.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
    seen=set();body=[]
    for v in bm.verts:
        if v in seen:continue
        todo=[v];seen.add(v);group=[]
        while todo:
            q=todo.pop();group.append(q)
            for e in q.link_edges:
                n=e.other_vert(q)
                if n not in seen:seen.add(n);todo.append(n)
        if len(group)>len(body):body=group
    body_positions={tuple(round(c,5) for c in world@v.co) for v in body};bm.free()
    # Coordinates refer to the unchanged orthographic albedo reference (1024px).
    polygon=[(300,460),(385,466),(424,530),(455,590),(441,618),(359,663),(308,646)]
    def mask(px,py):
        inside=False;distance=1e9
        for i,a in enumerate(polygon):
            b=polygon[(i+1)%len(polygon)]
            if (a[1]>py)!=(b[1]>py) and px<(b[0]-a[0])*(py-a[1])/(b[1]-a[1])+a[0]:inside=not inside
            dx=b[0]-a[0];dy=b[1]-a[1];t=max(0,min(1,((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy)))
            distance=min(distance,math.hypot(px-a[0]-t*dx,py-a[1]-t*dy))
        t=max(0,min(1,.5+(distance if inside else -distance)/16));return t*t*(3-2*t)
    uv=mesh.data.uv_layers.get('MuzzleRepairProjection') or mesh.data.uv_layers.new(name='MuzzleRepairProjection')
    attr=mesh.data.color_attributes.get('MuzzleRepairMask') or mesh.data.color_attributes.new(name='MuzzleRepairMask',type='FLOAT_COLOR',domain='CORNER')
    # Adding a color attribute can invalidate the previous RNA UV-layer handle.
    uv=mesh.data.uv_layers["MuzzleRepairProjection"]
    affected=set()
    for loop in mesh.data.loops:
        p=world@mesh.data.vertices[loop.vertex_index].co;u=(p.y+.835)/.55;v=(p.z-1.195)/.55
        uv.data[loop.index].uv=(u,v)
        value=1. if p.x>.065 and tuple(round(c,5) for c in p) in body_positions else 0
        attr.data[loop.index].color=(value,value,value,1)
        if value>0 and mask(u*1024,(1-v)*1024)>0:affected.add(loop.vertex_index)
    assert original_uv_values==[tuple(loop.uv) for loop in mesh.data.uv_layers[original_uv].data], "Source UVs changed during patch projection"
    image=bpy.data.images.load(str(Path(image_path).resolve()),check_existing=True);image.pack()
    for i,original in enumerate(list(mesh.data.materials)):
        mat=original.copy();mat.name=original.name+' muzzle repair authoring';mesh.data.materials[i]=mat
        nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
        original_coords=nodes.new('ShaderNodeUVMap');original_coords.uv_map=original_uv
        for node in list(nodes):
            if node.type=='TEX_IMAGE' and not node.inputs['Vector'].is_linked:links.new(original_coords.outputs['UV'],node.inputs['Vector'])
        if not bs.inputs['Base Color'].is_linked:continue
        source=bs.inputs['Base Color'].links[0].from_socket
        texture=nodes.new('ShaderNodeTexImage');texture.image=image;texture.extension='EXTEND'
        coords=nodes.new('ShaderNodeUVMap');coords.uv_map="MuzzleRepairProjection";links.new(coords.outputs['UV'],texture.inputs['Vector'])
        weight=nodes.new('ShaderNodeAttribute');weight.attribute_name=attr.name
        def math_node(op,a,b):
            n=nodes.new('ShaderNodeMath');n.operation=op
            for index,value in enumerate([a,b]):
                if isinstance(value,(float,int)):n.inputs[index].default_value=value
                else:links.new(value,n.inputs[index])
            return n.outputs[0]
        separate=nodes.new('ShaderNodeSeparateXYZ');links.new(coords.outputs['UV'],separate.inputs[0])
        px=math_node('MULTIPLY',separate.outputs['X'],1024);py=math_node('MULTIPLY',math_node('SUBTRACT',1,separate.outputs['Y']),1024)
        distance=None
        for j,a in enumerate(polygon):
            b=polygon[(j+1)%len(polygon)];dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy)
            cross=math_node('SUBTRACT',math_node('MULTIPLY',dx/length,math_node('SUBTRACT',py,a[1])),math_node('MULTIPLY',dy/length,math_node('SUBTRACT',px,a[0])))
            distance=cross if distance is None else math_node('MINIMUM',distance,cross)
        ramp=nodes.new('ShaderNodeMapRange');ramp.interpolation_type='SMOOTHERSTEP';ramp.clamp=True;links.new(distance,ramp.inputs['Value']);ramp.inputs['From Min'].default_value=-10;ramp.inputs['From Max'].default_value=6
        factor=math_node('MULTIPLY',weight.outputs['Fac'],ramp.outputs[0])
        mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MIX';links.new(factor,mix.inputs[0]);links.new(source,mix.inputs[1]);links.new(texture.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],bs.inputs['Base Color'])
    return {'affectedVertices':len(affected),'side':'right','runtimeReady':False,'requires':'original UV bake and both-side jaw validation'}
