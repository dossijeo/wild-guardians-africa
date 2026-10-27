"""Lion-specific recessed oral anatomy; no sheet across the front aperture."""
import math
import bpy
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

def add_cavity(body, lip):
    world=body.matrix_world.copy(); inverse=world.inverted()
    pivot=Vector((0,-.14,1.55)); rotation=Matrix.Rotation(.4,3,'X')
    vertices=[]; opened=[]; faces=[]; colors=[]
    body.data.calc_loop_triangles()
    shell=BVHTree.FromPolygons([world@v.co for v in body.data.vertices],
        [tuple(t.vertices) for t in body.data.loop_triangles],all_triangles=True)
    dental_recess=[]
    def smooth(a,b,x):
        t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
    def vertex(p,lower=False):
        p=Vector(p);vertices.append(inverse@p)
        weight=(1-smooth(-.18,-.15,p.y)) if lower else 0
        opened.append(inverse@p.lerp(pivot+rotation@(p-pivot),weight))
        return len(vertices)-1
    def face(indices,color):
        faces.append(indices);colors.append(color)
    grids=[]; columns=25; rows=11
    for lower in (False,True):
        grid=[]
        for row in range(rows):
            depth=row/(rows-1); line=[]
            for col in range(columns):
                u=2*col/(columns-1)-1
                front=-.216+.04*abs(u)**1.7
                y=front*(1-depth)-.148*depth
                x=.031*u*(1-.18*depth)+.003
                z=lip(front)*(1-depth)+1.551*depth
                z+=(-.009 if lower else .010)*(1-u*u)*math.sin(math.pi*(.15+.7*depth))
                line.append(vertex((x,y,z),lower))
            grid.append(line)
        for row in range(rows-1):
            for col in range(columns-1):
                ids=[grid[row][col],grid[row][col+1],grid[row+1][col+1],grid[row+1][col]]
                face(ids if lower else ids[::-1],(.22,.045,.052,1) if lower else (.13,.025,.033,1))
        grids.append(grid)
    upper,lower=grids
    # Only sides and rear connect roof and floor. No anterior curtain.
    for edge in (0,columns-1):
        for row in range(rows-1):
            face([upper[row][edge],upper[row+1][edge],lower[row+1][edge],lower[row][edge]],(.16,.025,.033,1))
    for col in range(columns-1):
        face([upper[-1][col],upper[-1][col+1],lower[-1][col+1],lower[-1][col]],(.055,.009,.015,1))

    # Closed, rounded tongue volume; it follows the lower jaw.
    rings=[]; count=20
    for row in range(13):
        t=row/12; y=-.209+.052*t; width=.020*math.sin(math.pi*(.12+.8*t))
        ring=[]
        for j in range(count):
            angle=2*math.pi*j/count
            x=width*math.cos(angle)
            z=lip(y)-.004+.003*math.sin(angle)
            ring.append(vertex((x,y,z),True))
        rings.append(ring)
    for row in range(len(rings)-1):
        for j in range(count):
            face([rings[row][j],rings[row][(j+1)%count],rings[row+1][(j+1)%count],rings[row+1][j]],(.38,.085,.105,1))
    face(rings[0][::-1],(.38,.085,.105,1));face(rings[-1],(.3,.06,.08,1))

    # Small original procedural teeth, positioned behind the lips.
    for is_lower in (False,True):
        for x in [-.028,-.017,-.010,-.0035,.0035,.010,.017,.028]:
            canine=abs(x)>.025
            y=-.212+(abs(x)/.048)**1.7*.032
            x+=.003
            z=lip(y)+(-.004 if is_lower else .005)
            length=(.008 if is_lower else .014) if canine else .005
            radius=.0034 if canine else .0027
            tooth=[]; start=len(vertices)
            for ring in range(5):
                t=ring/4; ids=[]
                for j in range(8):
                    angle=2*math.pi*j/8
                    r=radius*(1-.92*t)
                    ids.append(vertex((x+r*math.cos(angle),y+r*.7*math.sin(angle)+.002*t*t,
                                       z+(1 if is_lower else -1)*length*t),is_lower))
                tooth.append(ids)
            # Recess each rigid tooth behind the actual closed facial shell.
            # Moving the whole tooth preserves its shape; the asymmetric source
            # must not be approximated by mirrored depth constants.
            placement=None
            for inward in [0,.002,.004,.006,.008]:
                shift=0; valid=True; dx=inward*(1 if x<0 else -1)
                for index in range(start,len(vertices)):
                    point=world@vertices[index];point.x+=dx
                    hit,normal,face_index,distance=shell.ray_cast(Vector((point.x,-3,point.z)),Vector((0,1,0)))
                    if hit is None or hit.y>-.14:
                        valid=False;break
                    shift=max(shift,hit.y+.004-point.y)
                if valid and shift<.04:
                    placement=(dx,shift);break
            assert placement is not None, f'Tooth outside closed lip shell: lower={is_lower}, x={x}'
            dx,shift=placement
            dental_recess.append({'lower':is_lower,'x':x,'inwardShift':dx,'recession':shift})
            for index in range(start,len(vertices)):
                point=world@vertices[index];point.y+=shift;point.x+=dx
                vertices[index]=inverse@point
                # Teeth are rigid pieces, unlike the soft rear cheek transition.
                opened[index]=inverse@(pivot+rotation@(point-pivot) if is_lower else point)
            for ring in range(4):
                for j in range(8):
                    face([tooth[ring][j],tooth[ring][(j+1)%8],tooth[ring+1][(j+1)%8],tooth[ring+1][j]],(.78,.68,.46,1))
            face(tooth[0][::-1],(.7,.6,.4,1));face(tooth[-1],(.88,.8,.61,1))

    data=bpy.data.meshes.new('LionOralAnatomy');data.from_pydata(vertices,[],faces);data.update()
    obj=bpy.data.objects.new('LionOralAnatomy',data);bpy.context.collection.objects.link(obj)
    obj.parent=body.parent;obj.matrix_world=world
    for modifier in body.modifiers:
        if modifier.type=='ARMATURE':
            new=obj.modifiers.new(modifier.name,'ARMATURE');new.object=modifier.object
    head=obj.vertex_groups.new(name='Head');head.add(list(range(len(vertices))),1,'REPLACE')
    obj.shape_key_add(name='Basis');key=obj.shape_key_add(name='mouthOpen')
    for dst,p in zip(key.data,opened):dst.co=p
    attribute=data.color_attributes.new(name='OralColor',type='FLOAT_COLOR',domain='CORNER')
    for polygon,color in zip(data.polygons,colors):
        polygon.use_smooth=True
        for index in polygon.loop_indices:attribute.data[index].color=color
    material=bpy.data.materials.new('LionOralTissue');material.use_nodes=True
    bsdf=material.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.64
    color=material.node_tree.nodes.new('ShaderNodeVertexColor');color.layer_name='OralColor'
    material.node_tree.links.new(color.outputs['Color'],bsdf.inputs['Base Color'])
    data.materials.append(material)
    return {'vertices':len(vertices),'faces':len(faces),'materials':1,'dentalRecess':dental_recess,'frontAperture':'open; sides and rear only'}
