"""Selected workshop cloth, curved joinery, pottery and plinth paint in Blender.

Uses the preserved C mesh; no geometry/UV change. Leaves the prior C available
as the comparison. The shared-atlas experiment consumes this new colour pass.
"""
from pathlib import Path
import bpy,numpy as np,json
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/global-visual-lab/workshop-shared';OUT.mkdir(exist_ok=True,parents=True)
path=ROOT/'public/assets/visual-lab/mapu-0-art.bin';n=(path.stat().st_size-7992*12)//32
a=np.fromfile(path,dtype='<f4',count=n*8).reshape(-1,8);t=np.fromfile(path,dtype='<u4',offset=n*32).reshape(-1,3)
im=bpy.data.images.load(str(ROOT/'docs/qa/global-visual-lab/workshop-art/mapu-0-color-refined.png'));src=np.array(im.pixels[:],dtype=np.float32).reshape(2048,2048,4)[::-1].copy();pixels=src.copy();covered=np.zeros((2048,2048),bool)
def smooth(a,b,x):q=np.clip((x-a)/(b-a),0,1);return q*q*(3-2*q)
selection={name:[] for name in ['protected','woven-awning','curved-wood-lintel','left-pot','right-pot','original-plinth-pigment','doorstep']}
names=list(selection);kinds=[]
prior=json.loads((ROOT/'docs/qa/global-visual-lab/workshop-art/art-audit.json').read_text())['faceSelections']
protected_joinery=set(prior['dark-vertical-joinery']+prior['dark-horizontal-joinery'])
for face,ids in enumerate(t):
    p=a[ids,:3];center=p.mean(0);normal=a[ids,3:6].mean(0);x,y,z=center
    cuv=np.clip((a[ids,6:8].mean(0)*2047).astype(int),0,2047);color=src[cuv[1],cuv[0],:3]
    cloth=x<-.828 and -.216<z<-.056 and y>-.06 and normal[1]>.12 and color[0]>.60
    wood=face not in protected_joinery and -.795<x<-.64 and -.060<y<.032 and .004<z<.048 and normal[2]>.35 and .22<color[0]<.68 and color[1]>color[0]*.5 and color[2]>color[0]*.18
    potleft=(((x+.784)/.016)**2+((z-.030)/.018)**2<1.05 and -.146<y<-.102)
    potright=(((x+.674)/.020)**2+((z-.058)/.022)**2<1.05 and -.146<y<-.102)
    plinth=(-.137<y<-.113 and z>.012 and normal[2]>.35 and (x<-.787 or x>-.656))
    step=(-.766<x<-.685 and .029<z<.080 and -.149<y<-.136)
    k=1 if cloth else 2 if wood else 3 if potleft else 4 if potright else 5 if plinth else 6 if step else 0
    kinds.append(k);selection[names[k]].append(face)
    uv=a[ids,6:8]*2047;lo=np.maximum(np.floor(uv.min(0)).astype(int),0);hi=np.minimum(np.ceil(uv.max(0)).astype(int),2047)
    xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));d=uv[1]-uv[0];e=uv[2]-uv[0];det=d[0]*e[1]-d[1]*e[0]
    if abs(det)<1e-8:continue
    dx=xx-uv[0,0];dy=yy-uv[0,1];u=(dx*e[1]-dy*e[0])/det;v=(d[0]*dy-d[1]*dx)/det;inside=(u>=-.001)&(v>=-.001)&(u+v<=1.001);covered[yy[inside],xx[inside]]=True
    if not k:continue
    pos=p[0]+u[...,None]*(p[1]-p[0])+v[...,None]*(p[2]-p[0]);x,y,z=np.moveaxis(pos,-1,0);original=src[yy,xx,:3]
    if k==1:
        # Broad original red/cream stripes, following the sag of the cloth.
        across=x+.0025*np.sin((z+.13)*24)
        boundaries=[-.950,-.928,-.904,-.881,-.856,-.832,-.805]
        row=np.clip(np.searchsorted(boundaries,across)-1,0,5)
        cream=(row%2==0).astype(float)
        paint=np.array([.65,.235,.14])*(1-cream[...,None])+np.array([.84,.735,.56])*cream[...,None]
        seam=(np.exp(-((z+.065)/.0018)**2)+np.exp(-((z+.207)/.0018)**2))*.09
        paint=paint*(1-seam[...,None])*.85+original*.15
        strength=np.ones(x.shape)*.9
    elif k==2:
        angle=np.arctan2(x+.716,y+.063);radius=np.hypot(x+.716,y+.063)
        grain=.035*np.exp(-((radius-.075-.0015*np.sin(angle*4))/.0012)**2)+.045*np.exp(-((radius-.082-.001*np.sin(angle*3+.7))/.001)**2)
        paint=np.array([.455,.265,.135])*(1-grain[...,None])*.78+original*.22;strength=np.ones(x.shape)*.86
    elif k in (3,4):
        # Burnished ochre pottery with two quiet firing bands; preserve mouth.
        band=.06*np.exp(-((y+.122)/.004)**2)-.035*np.exp(-((y+.140)/.004)**2)
        paint=np.array([.54,.32,.16])*(1+band[...,None])*.72+original*.28
        light=original.mean(-1);strength=smooth(.08,.13,light)*.78
        strength*=smooth(-.147,-.143,y)*(1-smooth(-.106,-.102,y))
    elif k==5:
        # Existing cream/red marks remain at their original locations.
        cream=smooth(.50,.78,original[:,:,1]/np.maximum(original[:,:,0],.001))
        pigment=np.array([.54,.27,.19])*(1-cream[...,None])+np.array([.85,.74,.58])*cream[...,None]
        paint=pigment*.78+original*.22;strength=smooth(-.137,-.132,y)*(1-smooth(-.118,-.113,y))*.7
    else:
        # Worn sandstone step; retain broad source shade and two placed scuffs.
        scuff=.045*np.exp(-(((x+.739)/.013)**2+((z-.060)/.008)**2))+.035*np.exp(-(((x+.704)/.010)**2+((z-.045)/.007)**2))
        paint=np.array([.60,.43,.27])*(1+scuff[...,None])*.76+original*.24;strength=np.ones(x.shape)*.8
    result=original*(1-strength[...,None])+paint*strength[...,None];pixels[yy[inside],xx[inside],:3]=result[inside]
for _ in range(5):
    sums=np.zeros_like(pixels);counts=np.zeros(covered.shape)
    for axis,step in [(0,-1),(0,1),(1,-1),(1,1)]:
        valid=np.roll(covered,step,axis);sums+=np.roll(pixels,step,axis)*valid[...,None];counts+=valid
    fresh=(~covered)&(counts>0);pixels[fresh]=sums[fresh]/counts[fresh,None];covered|=fresh
paint=bpy.data.images.new('Workshop accessory paint',width=2048,height=2048,alpha=True);paint.pixels.foreach_set(pixels[::-1].copy().ravel());paint.filepath_raw=str(OUT/'mapu-0-color-accessories.png');paint.file_format='PNG';paint.save();paint.pack()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('Workshop accessories preserved mesh');mesh.from_pydata(a[:,:3].tolist(),[],t.tolist());mesh.update();mesh.normals_split_custom_set_from_vertices(a[:,3:6].tolist())
obj=bpy.data.objects.new('Workshop surface selections',mesh);bpy.context.collection.objects.link(obj);uv=mesh.uv_layers.new(name='Preserved C charts')
for loop in mesh.loops:uv.data[loop.index].uv=(a[loop.vertex_index,6],1-a[loop.vertex_index,7])
for name in names:
    mat=bpy.data.materials.new(name);mat.use_nodes=True;node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=paint;mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);mesh.materials.append(mat)
for face,k in zip(mesh.polygons,kinds):face.material_index=k;face.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'workshop-accessories.blend'))
(OUT/'accessory-audit.json').write_text(json.dumps({'size':[2048,2048],'geometryAndUv':'unchanged C','faceSelections':selection},indent=2)+'\n',newline='\n')
print({k:len(v) for k,v in selection.items()})
