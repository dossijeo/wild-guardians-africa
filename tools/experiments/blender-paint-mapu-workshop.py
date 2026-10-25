"""Art-directed Mapungubwe workshop pilot C, authored in Blender at 2048².

The spatial selections below are specific to mapu-0, not a general recolouring
filter. Roof courses follow its barrel; joinery follows the timber direction.
Front murals, orange arch face and awning remain source-painted. The front
zigzag trim is rebound to measured mesh creases. No random noise.
Runtime geometry is B unchanged. Blender material slots record the selections;
their colour is flattened to ONE runtime atlas/material.
"""
from pathlib import Path
import json, hashlib
import bpy
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/qa/global-visual-lab/workshop-art'
OUT.mkdir(parents=True,exist_ok=True)
ASSETS=ROOT/'public/assets/visual-lab'
v=next(v for v in json.loads((ROOT/'public/content/villages.json').read_text()) if v['id']=='mapungubwe')
unit=v['units'][0]
source=ROOT/'public'/v['binary']['url'].lstrip('/')
color=ROOT/'public'/v['textures']['color'].lstrip('/')
hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [source,color,ROOT/'public/content/villages.json']}
raw=np.fromfile(ASSETS/'mapu-0-repacked.bin',dtype='<f4',count=10147*8).reshape(-1,8)
tri=np.fromfile(ASSETS/'mapu-0-repacked.bin',dtype='<u4',offset=10147*32).reshape(-1,3)
base=bpy.data.images.load(str(ASSETS/'mapu-0-color-repacked.webp'))
# bpy pixels are bottom-up, runtime atlas rows are top-down (flipY=false).
pixels=np.asarray(base.pixels[:],dtype=np.float32).reshape(2048,2048,4)[::-1].copy()
original=pixels.copy()
mask=np.zeros((2048,2048,4),np.float32);mask[:,:,3]=1
covered=np.zeros((2048,2048),bool)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('mapu-0-preserved-topology')
mesh.from_pydata(raw[:,:3].tolist(),[],tri.tolist());mesh.update()
mesh.normals_split_custom_set_from_vertices(raw[:,3:6].tolist())
obj=bpy.data.objects.new('Workshop C — selective painted surfaces',mesh)
bpy.context.collection.objects.link(obj)
uv=mesh.uv_layers.new(name='B-repacked-runtime')
for loop in mesh.loops:uv.data[loop.index].uv=(raw[loop.vertex_index,6],1-raw[loop.vertex_index,7])
names=['protected-original','terracotta-courses','dark-vertical-joinery','dark-horizontal-joinery','side-stone','original-ornament-edge-clarity','front-arch-geometry-aligned']
palette=np.array([[.20,.20,.20,1],[1,.25,.06,1],[.15,.75,.3,1],[.1,.5,1,1],[.8,.3,.8,1],[1,.85,.1,1],[.1,1,1,1]],np.float32)
arch_records=json.loads((OUT/'arch-paint-edges.json').read_text())
arch_edges=np.asarray([e['ends'] for e in arch_records],dtype=np.float32)
for name,c in zip(names,palette):
    mat=bpy.data.materials.new(name);mat.diffuse_color=c;mesh.materials.append(mat)
selection={name:[] for name in names}
def smooth(a,b,x):
    t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
for face,ids in enumerate(tri):
    world=raw[ids,:3];center=world.mean(0);normal=raw[ids,3:6].mean(0)
    x,y,z=center;rad=np.hypot(x+.716,y+.063)
    # The central barrel excludes both decorated end bands and the porch.
    roof=(-.258<z<-.006 and -.85<x<-.585 and y>-.083 and rad>.103 and (normal[0]*(x+.716)+normal[1]*(y+.063))>.025)
    # Door inset in the positive-Z gable; upper crossbar has a separate grain.
    door=(-.772<x<-.661 and .005<z<.022 and -.133<y<-.042 and normal[2]>.55)
    beam=(-.785<x<-.647 and .015<z<.036 and -.051<y<-.027 and normal[2]>-.1)
    # Side foundation only: all frontal sun motifs and corner blocks excluded.
    stone=(-.250<z<-.024 and -.141<y<-.091 and (x>-.617 or -.846<x<-.822) and abs(normal[0])>.65)
    trim=((.022<z<.043 or -.295<z<-.263) and -.85<x<-.585 and y>-.073 and rad>.106 and (normal[0]*(x+.716)+normal[1]*(y+.063))>.025 and abs(normal[2])<.85)
    axial=z-.085*(x+.716)
    arch=(-.009<axial<.028 and -.86<x<-.58 and y>-.08 and rad>.095 and (normal[0]*(x+.716)+normal[1]*(y+.063))>.018)
    kind=6 if arch else 1 if roof else 3 if beam else 2 if door else 4 if stone else 5 if trim else 0
    mesh.polygons[face].material_index=kind;mesh.polygons[face].use_smooth=True
    selection[names[kind]].append(face)
    uvp=raw[ids,6:8]*2047
    lo=np.maximum(np.floor(uvp.min(0)).astype(int),0);hi=np.minimum(np.ceil(uvp.max(0)).astype(int),2047)
    xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1))
    det=np.cross(uvp[1]-uvp[0],uvp[2]-uvp[0])
    if abs(det)<1e-7:continue
    delta=np.stack((xx-uvp[0,0],yy-uvp[0,1]),-1)
    b=(delta[:,:,0]*(uvp[2,1]-uvp[0,1])-delta[:,:,1]*(uvp[2,0]-uvp[0,0]))/det
    c=((uvp[1,0]-uvp[0,0])*delta[:,:,1]-(uvp[1,1]-uvp[0,1])*delta[:,:,0])/det
    inside=(b>=-.001)&(c>=-.001)&(b+c<=1.001)
    covered[yy[inside],xx[inside]]=True
    if not kind:continue
    pos=world[0]+b[:,:,None]*(world[1]-world[0])+c[:,:,None]*(world[2]-world[0])
    x,y,z=np.moveaxis(pos,-1,0)
    src=original[yy,xx,:3]
    if kind==1:
        # Barrel coordinates maintain continuity across fragmented UV islands.
        # Hand-set course spacing and tile ends: deliberately uneven earthenware.
        edges=np.array([-1.65,-1.36,-1.10,-.83,-.55,-.28,0,.28,.55,.83,1.10,1.36,1.65])
        angle=np.arctan2(x+.716,y+.063)
        row=np.clip(np.searchsorted(edges,angle)-1,0,len(edges)-2)
        fy=(angle-edges[row])/(edges[row+1]-edges[row])
        ends=np.array([-.280,-.247,-.214,-.184,-.151,-.120,-.086,-.055,-.022,.010])
        axial=z+(row%2)*.015
        col=np.clip(np.searchsorted(ends,axial)-1,0,len(ends)-2)
        fx=(axial-ends[col])/(ends[col+1]-ends[col])
        # The shallow bow in each lower lip reads as a shaped tile, not a grid.
        bowed=fy-.035*np.sin(np.clip(fx,0,1)*np.pi)
        joint=(1-smooth(.01,.055,bowed))*.20+(1-smooth(.008,.04,np.minimum(fx,1-fx)))*.12
        lip=np.exp(-((bowed-.085)/.05)**2)*.075
        # An authored five-colour cadence; keep original broad pigment only 12%.
        tones=np.array([1.00,.965,1.025,.985,1.015])[(col+row*2)%5]
        pigment=np.array([.817,.296,.091],np.float32)
        basepaint=pigment[None,None,:]*tones[:,:,None]
        painted=(basepaint*.88+src*.12)*(1-joint+lip-.018*np.sin(np.clip(fx,0,1)*np.pi))[:,:,None]
        # Low saturation and pale original marks are retained even in selection.
        guard=smooth(1.25,1.65,src[:,:,0]/np.maximum(src[:,:,1],.001))
        edge=smooth(-.258,-.253,z)*(1-smooth(-.011,-.006,z))
        strength=guard*edge
    elif kind in (2,3):
        along=y if kind==2 else x
        across=x if kind==2 else y
        boards=np.array([-.780,-.759,-.738,-.716,-.695,-.674,-.650]) if kind==2 else np.array([-.056,-.026])
        bidx=np.clip(np.searchsorted(boards,across)-1,0,len(boards)-2)
        f=(across-boards[bidx])/(boards[bidx+1]-boards[bidx])
        seam=(1-smooth(.015,.075,np.minimum(f,1-f)))*.28
        woodtones=np.array([[.49,.285,.145],[.44,.246,.123],[.53,.31,.158],[.465,.265,.130],[.505,.29,.142],[.45,.25,.12]])
        pigment=woodtones[bidx%6]
        # Three meandering growth streaks per board, and two placed oval knots.
        growth=np.zeros(x.shape)
        for trace,amp in [(.23,.065),(.49,.04),(.76,.055)]:
            path=trace+.025*np.sin(along*88+trace*7)
            growth+=amp*np.exp(-((f-path)/.022)**2)
        knot=np.zeros(x.shape)
        if kind==2:
            for kx,ky in [(-.748,-.093),(-.685,-.116)]:
                ellipse=np.sqrt(((x-kx)/.0027)**2+((y-ky)/.009)**2)
                knot+=.12*np.exp(-((ellipse-1)/.12)**2)+.08*np.exp(-(ellipse/.55)**2)
        bevel=np.exp(-((f-.10)/.035)**2)*.07
        painted=(pigment*.78+src*.22)*(1-seam-growth-knot+bevel)[:,:,None]
        strength=np.full(x.shape,.88)
    elif kind==4:
        # Deliberately placed, squarish rounded stones; no generated scatter.
        stones=[(-.239,-.105,.018,.012,-.10,0),(-.204,-.104,.019,.011,.08,1),
                (-.166,-.105,.019,.013,-.06,2),(-.128,-.105,.019,.011,.06,3),
                (-.090,-.105,.020,.012,-.09,1),(-.051,-.104,.019,.013,.05,0),
                (-.250,-.130,.016,.012,.06,2),(-.217,-.129,.017,.012,-.06,3),
                (-.181,-.130,.018,.012,.05,0),(-.145,-.129,.018,.013,-.08,1),
                (-.108,-.131,.018,.012,.07,2),(-.071,-.130,.018,.012,-.05,3),
                (-.034,-.130,.018,.013,.04,0)]
        stonetones=np.array([[.57,.33,.27],[.49,.28,.23],[.61,.37,.30],[.53,.30,.255]])
        painted=src*.35+np.array([.28,.145,.12])[None,None,:]*.65
        for sz,sy,sw,sh,tilt,tone in stones:
            dz=z-sz;dy=y-sy-tilt*dz
            distance=((np.abs(dz)/sw)**4+(np.abs(dy)/sh)**4)**.25
            fill=1-smooth(.84,1.02,distance)
            edgeShade=.91+.08*np.clip(dy/sh,-1,1)+.045*np.exp(-((distance-.72)/.12)**2)
            stonecolor=(stonetones[tone][None,None,:]*.72+src*.28)*edgeShade[:,:,None]
            painted=painted*(1-fill[:,:,None])+stonecolor*fill[:,:,None]
        strength=smooth(-.141,-.138,y)*(1-smooth(-.095,-.091,y))*.86
    elif kind==5:
        # Preserve the existing painted mask: palette separation only, no new motif.
        ratio=src[:,:,1]/np.maximum(src[:,:,0],.001)
        cream=smooth(.51,.79,ratio)
        cream=smooth(.18,.82,cream)
        light=.78+.22*src[:,:,0]
        pigment=np.array([.47,.185,.13])[None,None,:]*(1-cream[:,:,None])+np.array([.94,.84,.72])[None,None,:]*cream[:,:,None]
        painted=pigment*light[:,:,None]
        # Orange arch surfaces do not qualify; protects their original pigment.
        strength=.48*smooth(.60,.82,src[:,:,2]/np.maximum(src[:,:,1],.001))
    else:
        # Rebind the existing zigzag motif to measured mesh bevels, in 3D.
        # No idealised sine-wave motif, UV displacement, normal map, or new relief.
        white=np.zeros(x.shape)
        for edge,(start,end) in zip(arch_records,arch_edges):
            direction=end-start
            projection=np.clip(np.sum((pos-start)*direction,axis=-1)/np.dot(direction,direction),0,1)
            near=start+projection[:,:,None]*direction
            distance=np.linalg.norm(pos-near,axis=-1)
            width=(.0010,.0017) if edge['role']=='border' else (.00125,.0020)
            white=np.maximum(white,1-smooth(*width,distance))
        painted=np.array([.57,.265,.20])[None,None,:]*(1-white[:,:,None])+np.array([.83,.765,.65])[None,None,:]*white[:,:,None]
        strength=np.ones(x.shape)
    result=src*(1-strength[:,:,None])+painted*strength[:,:,None]
    pixels[yy[inside],xx[inside],:3]=np.clip(result[inside],0,1)
    mask[yy[inside],xx[inside]]=palette[kind]

# Refresh island padding after repainting. Otherwise bilinear/mip sampling pulls
# the OLD red paint into the new white stroke at every fragmented island edge.
for _ in range(5):
    sums=np.zeros_like(pixels);counts=np.zeros(covered.shape,np.float32)
    for axis,step in [(0,-1),(0,1),(1,-1),(1,1)]:
        valid=np.roll(covered,step,axis)
        sums+=np.roll(pixels,step,axis)*valid[:,:,None];counts+=valid
    fresh=(~covered)&(counts>0)
    pixels[fresh]=sums[fresh]/counts[fresh,None]
    covered|=fresh

def save_image(name,data,path):
    im=bpy.data.images.new(name,width=2048,height=2048,alpha=True)
    im.pixels.foreach_set(data[::-1].copy().ravel());im.filepath_raw=str(path);im.file_format='PNG';im.save();return im
paint=save_image('Workshop C colour',pixels,OUT/'mapu-0-color-art.png')
paint.pack()
save_image('Explicit surface selections',mask,OUT/'surface-selection.png')
for mat in mesh.materials:
    mat.use_nodes=True;node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=paint
    mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'workshop-art.blend'))
report={'sourceHashes':hashes,'size':[2048,2048],'vertices':len(raw),'triangles':len(tri),'runtimeMaterialCount':1,'faceSelections':selection,'changedPixels':int(np.any(abs(pixels-original)>.00001,axis=2).sum()),'positionMaxError':0,'normalMaxError':0,'uvVariant':'unchanged B','method':'explicit Blender face selections and barrel/board-space painted strokes; no random noise'}
(OUT/'art-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='faceSelections'},indent=2));print({k:len(v) for k,v in selection.items()})
assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in hashes.items())
