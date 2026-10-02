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
simulation = simulation.replace('function floorAt(p){return ', "function floorAt(p){if(surface){const y=surface(p[0],p[2]);if(!Number.isFinite(y))throw new Error('Superficie VFX inválida');return y;}return ")
simulation = simulation.replace('if(p.p[1]<p.ground+.025', 'if(surface)p.ground=floorAt(p.p);if(p.p[1]<p.ground+.025')
combat = section('const DUST_TEXTURES=', 'const paths=')
combat = combat.replace("if(!isSeeking)window.dispatchEvent(new CustomEvent('wgvfx:impact',{detail:{...lastImpact}}));", 'contacts.push({...lastImpact});')
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
export function createNativeVfx(id,spriteRects,{density=1,wind=.3,layers={},surface=null}={}){
 const definitions=vfxDefinitions,contacts=[],style=vfxRigidStyles;
 const rigidGeo=style,rigidBuffers=Object.fromEntries(Object.keys(style).map(k=>[k,new Float32Array(256*23)])),rigidPacked=Object.fromEntries(Object.keys(style).map(k=>[k,{count:0,data:rigidBuffers[k]}]));
'''+random+settings+'''
 if(!Number.isFinite(density)||density<=0||!Number.isFinite(wind))throw new Error('Configuración VFX inválida');
 if(surface!==null&&typeof surface!=='function')throw new Error('Superficie VFX inválida');
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
