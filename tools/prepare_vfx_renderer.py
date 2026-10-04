"""Extract VFX Atelier V4 presentation kernels, without UI, proxies or gameplay."""
import hashlib
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parents[1]
source = root/'references/extracted/Wild_Guardians_VFX_Atelier_V4/script-1.js'
code = source.read_text(encoding='utf-8')
assets_path = source.parent/'embedded-assets.json'
assets = json.loads(assets_path.read_text(encoding='utf-8'))

def section(start, end):
    a = code.index(start)
    return code[a:code.index(end, a)]

helpers = 'const TAU=Math.PI*2;\n'+section('const clamp=', 'let seed=')
random = section('let seed=', 'const settings=')
settings = section('const settings=', 'const canvas=')
definitions = section('const definitions=', 'let current=')
shaders = ''
world_vertex = re.search(r'const worldVertex=`([\s\S]*?)`;', code).group(1)
for name, exported in [('spriteP', 'vfxSprite'), ('fxP', 'vfxGeometry'), ('meshP', 'vfxRigid'), ('shadowP', 'vfxShadow')]:
    vertex, fragment = re.search(r'const '+name+r'=program\(`([\s\S]*?)`,\s*`([\s\S]*?)`\);', code).groups()
    vertex = vertex.replace('${worldVertex}', world_vertex)
    shaders += f'export const {exported}Vertex={json.dumps(vertex)};\nexport const {exported}Fragment={json.dumps(fragment)};\n'
shapes = section('function tri(', 'class Builder{')
shapes = 'export function createVfxGeometries(){\n'+shapes+'''
 const leaf=G.leaf.slice();for(let i=0;i<leaf.length;i+=6)leaf[i+1]-=.5;
 return Object.fromEntries(Object.entries({soil:G.rock,wood:roundedBox(1,1,1,.07,3),stone:G.rock,adobe:G.box,leaf,water:G.small,corn:G.ball}).map(([id,data])=>[id,new Float32Array(data)]));
}
'''
style = section('const style=', 'function makeWaterCan(').replace('const style=', 'export const vfxRigidStyles=')
rigid_pack = section('function updateRigidBuffers(', 'function renderScene(')
rigid_pack = rigid_pack.replace('function updateRigidBuffers()', 'function rigidInstances()')
rigid_pack = rigid_pack.replace('rigidGeo[k].instancesFrom(rigidBuffers[k],Math.min(256,counts[k]));', 'rigidPacked[k].count=Math.min(256,counts[k]);')
rigid_pack = rigid_pack.rstrip()[:-1]+'return rigidPacked;}\n'
geometry = 'let fxVertices=[];\n'+section('function fxTri(', 'function paintGeometryFX(')
simulation = section('let current=', 'function updateRigidBuffers(')
simulation = simulation.replace('if(rebuild)buildStation(current.id);', '')
simulation = simulation.replace('const mouth=M.pt(toolModel,[.62,.21,0]);', "const source=waterSource?.(clock);if(waterSource&&!source)return;const mouth=source?.position??M.pt(toolModel,[.62,.21,0]);")
simulation = simulation.replace('[rand(1.4,2.05),rand(-.48,-.15),rand(-.45,.45)],[s,s*1.7,s]', "waterSource?[source.direction[0]*rand(.2,.4),rand(-.48,-.15),source.direction[2]*rand(.2,.4)]:[rand(1.4,2.05),rand(-.48,-.15),rand(-.45,.45)],[s,s*1.7,s]")

simulation = simulation.replace('function floorAt(p){return ', "function floorAt(p){if(surface){const y=surface(p[0],p[2]);if(!Number.isFinite(y))throw new Error('Superficie VFX inválida');return y;}return ")
simulation = simulation.replace('if(p.p[1]<p.ground+.025', 'if(surface)p.ground=floorAt(p.p);if(p.p[1]<p.ground+.025')
simulation = simulation.replace('target=clamp(t,0,current.duration)', "target=clamp(t,0,agricultureMode?agricultureDuration:shieldMode==='barrier'?shieldDuration:current.duration)")
simulation = simulation.replace("case'dust':at(.25,()=>stepDust(-.72,.17));at(.57,()=>stepDust(0,-.06));at(.93,()=>stepDust(.75,.17));break;", "case'dust':if(stepMode)at(0,()=>stepDust(0,0));else{at(.25,()=>stepDust(-.72,.17));at(.57,()=>stepDust(0,-.06));at(.93,()=>stepDust(.75,.17));}break;")
combat = section('const DUST_TEXTURES=', 'const paths=')
combat = combat.replace("if(!isSeeking)window.dispatchEvent(new CustomEvent('wgvfx:impact',{detail:{...lastImpact}}));", 'contacts.push({...lastImpact});')
# Production Shield reuses the original mesh, rings, stars and block particles.
# Its lifetime and actual contacts are domain facts, not the lab's timed attack.
geometry = geometry.replace("const vis=smooth(.35,.9,t)*(1-smooth(3.65,4.65,t)),r=1.65*smooth(.35,.92,t);shieldDome(r,vis*.65);", "const vis=shieldMode==='contact'?0:smooth(.35,.9,t)*(1-smooth(shieldMode==='barrier'?shieldDuration-.5:3.65,shieldMode==='barrier'?shieldDuration:4.65,t)),r=1.65*(shieldMode==='barrier'?1:smooth(.35,.92,t));shieldDome(r,vis*.65);")
geometry = geometry.replace('const u=attackWindow(1.85,.7);', "const u=shieldMode==='barrier'?null:attackWindow(shieldMode==='contact'?0:1.85,.7);")
geometry = geometry.replace('p:V.add(center,[n[0]*radius,n[1]*radius*1.2,n[2]*radius])', "p:V.add(center,[n[0]*radius,n[1]*radius*1.2+(shieldMode==='barrier'&&surface?floorAt([n[0]*radius,0,n[2]*radius]):0),n[2]*radius])")
combat = combat.replace("at(.54,()=>twinkle([0,.7,0],7,'#9bdbc6'));", "if(shieldMode!=='contact')at(.54,()=>twinkle([0,.7,0],7,'#9bdbc6'));")
combat = combat.replace("at(1.85,()=>{contact([-1.5,.86,0]", "if(shieldMode!=='barrier')at(shieldMode==='contact'?0:1.85,()=>{contact([-1.5,.86,0]")
combat = combat.replace('const vis=smooth(.38,.92,t)*(1-smooth(3.65,4.7,t));', "const vis=shieldMode==='contact'?0:smooth(.38,.92,t)*(1-smooth(shieldMode==='barrier'?shieldDuration-.5:3.65,shieldMode==='barrier'?shieldDuration:4.7,t));")
combat = combat.replace('const u=attackWindow(1.25,.61);', "const u=shieldMode?null:attackWindow(1.25,.61);")
# Approved farm powers reuse the blessing aura, with no decorative healing hearts.
# Keep the unadapted composition identical for the original Atelier comparison.
geometry = geometry.replace("const vis=smooth(.3,.8,t)*(1-smooth(3.8,4.6,t));", "const vis=smooth(.3,.8,t)*(1-smooth(agricultureMode?agricultureDuration-.5:3.8,agricultureMode?agricultureDuration:4.6,t)),blessingColor=agricultureMode==='multiply'?amber:jade;")
heal_geometry_start = geometry.index("if(id==='heal'")
heal_geometry_end = geometry.index("if(id==='stun'",heal_geometry_start)
geometry = geometry[:heal_geometry_start]+geometry[heal_geometry_start:heal_geometry_end].replace(',jade,',',blessingColor,')+geometry[heal_geometry_end:]
combat = combat.replace("for(let j=0;j<6;j++)at(.65+j*.44", "if(!agricultureMode)for(let j=0;j<6;j++)at(.65+j*.44")
combat = combat.replace("at(.65,()=>{for(let j=0;j<7;j++){const a=j/7*TAU;solid('leaf'", "for(let burst=0;burst<(agricultureMode?Math.ceil(agricultureDuration/3):1);burst++)at(.65+burst*3,()=>{for(let j=0;j<7;j++){const a=j/7*TAU;solid('leaf'")
combat = combat.replace("const vis=smooth(.32,.85,t)*(1-smooth(3.75,4.75,t));", "const vis=smooth(.32,.85,t)*(1-smooth(agricultureMode?agricultureDuration-.5:3.75,agricultureMode?agricultureDuration:4.75,t));")
for original in ["'#a7d5a4'","'#d3dda2'","'#9fb765'"]:
    combat = combat.replace(original,"(agricultureMode==='multiply'?'#eac98d':"+original+")")
combat = combat.replace('V.scale([.16,.43,.13],vis*.65)',"V.scale(agricultureMode==='multiply'?color('#eac98d'):[.16,.43,.13],vis*.65)")
combat = combat.replace('V.scale([.11,.3,.2],vis*.45)',"V.scale(agricultureMode==='multiply'?color('#eac98d'):[.11,.3,.2],vis*.45)")
geometry = geometry.replace('const at=(r,a)=>V.add(p,V.add(V.scale(U,Math.cos(a)*r),V.scale(W,Math.sin(a)*r)));',"const at=(r,a)=>{const q=V.add(p,V.add(V.scale(U,Math.cos(a)*r),V.scale(W,Math.sin(a)*r)));if(agricultureMode&&current.id==='heal'&&surface)q[1]+=floorAt(q);return q;};")
geometry = geometry.replace('return[Math.cos(angle)*(.55-.2*u),.18+u*1.6,Math.sin(angle)*(.55-.2*u)]',"const q=[Math.cos(angle)*(.55-.2*u),.18+u*1.6,Math.sin(angle)*(.55-.2*u)];if(agricultureMode&&surface)q[1]+=floorAt(q);return q")
combat = combat.replace("solid('leaf',[Math.cos(a)*.55,.1,Math.sin(a)*.55]","solid('leaf',blessingLeafOrigin(a)")
combat = "function blessingLeafOrigin(a){const p=[Math.cos(a)*.55,.1,Math.sin(a)*.55];if(agricultureMode&&surface)p[1]+=floorAt(p);return p;}\n"+combat
rects = section('const spriteRects={};', 'const MAX_SPRITES=')
rects = 'export function createVfxAtlasRects(ASSETS,width,height){const atlasImage={width,height};'+rects+'return spriteRects;}\n'
pack = section('function paintSprites(', 'gl.useProgram(spriteP.p);')
pack = pack.replace('function paintSprites(list,env,cam)', 'export function packVfxSprites(list,spriteRects,cam)')
pack = pack.replace('if(!list.length)return;', 'const spriteData=new Float32Array(MAX_SPRITES*25);if(!list.length)return {count:0,data:spriteData};')
pack += 'return {count,data:spriteData};}\n'

module = '// Generated from original VFX Atelier V4 by tools/prepare_vfx_renderer.py.\n'+helpers+shaders+shapes+style+rects+'export const MAX_SPRITES=760,MAX_FX_VERTS=48000;\n'+pack
environment = section(' const t=clamp(v/.46)', '// Test maquettes only.')
module += 'export function vfxEnvironment(v,nightFill=.14){const settings={nightFill};\n'+environment
module += definitions.replace('const definitions=', 'export const vfxDefinitions=')
module += '''
export function createNativeVfx(id,spriteRects,{density=1,wind=.3,layers={},surface=null,waterSource=null,shieldMode=null,shieldDuration=20,agricultureMode=null,agricultureDuration=30,stepMode=false}={}){
 const definitions=vfxDefinitions,contacts=[],style=vfxRigidStyles;
 const rigidGeo=style,rigidBuffers=Object.fromEntries(Object.keys(style).map(k=>[k,new Float32Array(256*23)])),rigidPacked=Object.fromEntries(Object.keys(style).map(k=>[k,{count:0,data:rigidBuffers[k]}]));
'''+random+settings+'''
 if(!Number.isFinite(density)||density<=0||!Number.isFinite(wind))throw new Error('Configuración VFX inválida');
 if(surface!==null&&typeof surface!=='function')throw new Error('Superficie VFX inválida');
 if(shieldMode!==null&&!['barrier','contact'].includes(shieldMode)||!Number.isFinite(shieldDuration)||shieldDuration<1)throw new Error('Configuración Escudo inválida');
 if(agricultureMode!==null&&(!['growth','multiply'].includes(agricultureMode)||id!=='heal')||!Number.isFinite(agricultureDuration)||agricultureDuration<1)throw new Error('Configuración magia agrícola inválida');
 if(typeof stepMode!=='boolean'||stepMode&&id!=='dust')throw new Error('Configuración de pisada inválida');
 settings.density=density;settings.wind=wind;Object.assign(settings.layers,layers);
 let toolModel=M.I(),toolVisible=false,wallVisible=true,lightPos0=[0,1,0],lightPos1=[0,1,0],lightCol0=[0,0,0],lightCol1=[0,0,0];
'''+simulation+geometry+combat+rigid_pack+'''
 current=definitions.find(d=>d.id===id);if(!current)throw new Error('Composición VFX desconocida');restartEffect(false);
 return {
  get definition(){return current;},get time(){return clock;},get parts(){return parts;},get rigids(){return rigids;},get wetness(){return wetness;},contacts,
  get lights(){return {positions:[lightPos0.slice(),lightPos1.slice()],colors:[lightCol0.slice(),lightCol1.slice()]};},
  get tool(){return {visible:toolVisible,matrix:new Float32Array(toolModel)};},
  step(dt){if(!Number.isFinite(dt)||dt<0)throw new Error('Paso VFX inválido');if(dt)simulate(dt);},
  advance(dt){if(!Number.isFinite(dt)||dt<0)throw new Error('Paso VFX inválido');for(let remaining=dt;remaining>1e-9;){const sub=Math.min(1/60,remaining);simulate(sub);remaining-=sub;}},
  seek(t){if(!Number.isFinite(t)||t<0)throw new Error('Tiempo VFX inválido');contacts.length=0;seekTo(t);},
  sprites(){return spriteInstances();},rigidInstances,geometry(){composeGeometryFX();return new Float32Array(fxVertices.slice(0,MAX_FX_VERTS*11));},
  clear(){parts.length=0;rigids.length=0;events.length=0;contacts.length=0;fxVertices.length=0;lightCol0=[0,0,0];lightCol1=[0,0,0];},
 };
}
'''
target = root/'src/rendering/vfx-native.js'
target.write_text(module, encoding='utf-8', newline='\n')
atlas = root/'public'/assets['atlas'].lstrip('/')
header = atlas.read_bytes()[:30]
assert header[:4] == b'RIFF' and header[12:16] == b'VP8X'
dimensions = [1+int.from_bytes(header[24:27], 'little'),1+int.from_bytes(header[27:30], 'little')]
manifest = {'source':source.relative_to(root).as_posix(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
    'moduleSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'atlas':assets['atlas'],'atlasSha256':hashlib.sha256(atlas.read_bytes()).hexdigest(),
    'atlasDimensions':dimensions,'resources':len(assets['resources']),'compositions':18,'structuralDamage':'external','previewContactsOnly':True}
(root/'content/manifests/vfx-native.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Extracted VFX Atelier: 18 compositions, 19 textures, original shaders and presentation physics')
