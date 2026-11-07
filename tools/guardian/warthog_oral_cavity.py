"""Recessed palate, floor and rounded tongue for the native lateral opening."""
import math
import bpy
from mathutils import Vector,Matrix
from warthog_jaw_profile import lower_weight

def add_cavity(body):
    world=body.matrix_world.copy();inverse=world.inverted()
    pivot=Vector((0,-.25,1.43));rotation=Matrix.Rotation(.28,3,'X')
    verts=[];opened=[];faces=[];colors=[]
    def smooth(a,b,x):
        t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
    def vertex(point,lower=False):
        point=Vector(point);verts.append(inverse@point)
        # Use the floor's attachment height for the volume, so the tongue's
        # upper and lower vertices cannot separate as the skin mask tapers.
        weight=lower_weight(Vector((point.x,point.y,1.40))) if lower else 0
        opened.append(inverse@point.lerp(pivot+rotation@(point-pivot),weight))
        return len(verts)-1
    def face(ids,color):faces.append(ids);colors.append((*color,1))
    grids=[];columns=21;rows=15
    for lower in (False,True):
        grid=[]
        for row in range(rows):
            depth=row/(rows-1);line=[]
            for col in range(columns):
                u=2*col/(columns-1)-1
                y=-.59+.35*depth;x=.225*u*(1-.28*depth)
                z=(1.40 if lower else 1.485)+(-.008 if lower else .025)*(1-u*u)*math.sin(math.pi*depth)
                line.append(vertex((x,y,z),lower))
            grid.append(line)
        for row in range(rows-1):
            for col in range(columns-1):
                ids=[grid[row][col],grid[row][col+1],grid[row+1][col+1],grid[row+1][col]]
                face(ids if lower else ids[::-1],(.19,.035,.042) if lower else (.12,.018,.025))
        grids.append(grid)
    upper,lower=grids
    # The original opening is lateral: never put a sheet across its sides.
    # Only the recessed rear joins the palate and floor.
    for col in range(columns-1):
        face([upper[-1][col],upper[-1][col+1],lower[-1][col+1],lower[-1][col]],(.065,.009,.014))
    rings=[];segments=20
    for row in range(15):
        t=row/14;y=-.555+.27*t;width=.115*math.sin(math.pi*(.09+.82*t));ring=[]
        for j in range(segments):
            angle=j*math.tau/segments
            ring.append(vertex((width*math.cos(angle),y,1.407+.014*math.sin(angle)),True))
        rings.append(ring)
    for row in range(len(rings)-1):
        for j in range(segments):
            face([rings[row][j],rings[row][(j+1)%segments],rings[row+1][(j+1)%segments],rings[row+1][j]],(.32,.065,.078))
    face(rings[0][::-1],(.3,.055,.065));face(rings[-1],(.23,.035,.045))
    # Rounded gingival ridges behind the native tusk roots, not a cover over
    # the aperture. Upper ridges stay with the palate; lower ones share the jaw.
    for is_lower in (False,True):
        for side in (-1,1):
            gum=[]
            for row in range(12):
                t=row/11;ring=[];radius=.011*math.sin(math.pi*(.08+.84*t))
                for j in range(8):
                    angle=j*math.tau/8
                    ring.append(vertex((side*(.195-.04*t)+radius*math.cos(angle),-.555+.265*t,
                        (1.40 if is_lower else 1.48)+radius*.7*math.sin(angle)),is_lower))
                gum.append(ring)
            for row in range(11):
                for j in range(8):face([gum[row][j],gum[row][(j+1)%8],gum[row+1][(j+1)%8],gum[row+1][j]],(.24,.045,.06))
            face(gum[0][::-1],(.24,.045,.06));face(gum[-1],(.24,.045,.06))
    data=bpy.data.meshes.new('WarthogOralAnatomy');data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new('WarthogOralAnatomy',data);bpy.context.collection.objects.link(obj)
    obj.parent=body.parent;obj.matrix_world=world
    for mod in body.modifiers:
        if mod.type=='ARMATURE':obj.modifiers.new('Oral skeleton','ARMATURE').object=mod.object
    obj.vertex_groups.new(name='Head').add(list(range(len(verts))),1,'REPLACE')
    obj.shape_key_add(name='Basis');key=obj.shape_key_add(name='mouthOpen')
    for dst,p in zip(key.data,opened):dst.co=p
    attribute=data.color_attributes.new(name='OralColor',type='FLOAT_COLOR',domain='CORNER')
    for polygon,color in zip(data.polygons,colors):
        polygon.use_smooth=True
        for i in polygon.loop_indices:attribute.data[i].color=color
    mat=bpy.data.materials.new('Warthog oral tissue');mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.72
    node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='OralColor'
    mat.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color']);data.materials.append(mat)
    return {'vertices':len(verts),'faces':len(faces),'materials':1,'aperture':'front and lateral openings; recessed rear only'}
