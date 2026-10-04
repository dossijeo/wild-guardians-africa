"""Reproduce the V4.1.10.3 recipes; gameplay and Three bindings live separately."""
from pathlib import Path
import hashlib,json

root=Path(__file__).resolve().parents[1]
folder=root/'references/extracted/Bioma_Lab_V4_1_10_3_Manglar_Barro_Humedo'
source=(folder/'script-28.js').read_text(encoding='utf-8')
manifest=json.loads((root/'content/manifests/assets.json').read_text(encoding='utf-8'))
record=next(s for s in manifest['sources'] if s['file']=='Bioma_Lab_V4_1_10_3_Manglar_Barro_Humedo.html')

def prepare_archive_manifest():
    geometry=json.loads((folder/'settlement-geometry.json').read_text(encoding='utf-8'))
    urls=[p['url'] for p in record['payloads'] if p['id'].startswith('village-')]
    urls += [geometry[role]['url'] for role in ('v','uv','i')]
    result={'source':record['file'],'sha256':record['sha256'],'archiveOnly':urls}
    (root/'content/manifests/biome-lab-update.json').write_bytes((json.dumps(result,indent=2)+'\n').encode('utf-8'))

prepare_archive_manifest()
def fragment(start,end):return source[source.index(start):source.index(end)]
def write(path,text):
    (root/path).write_bytes(('\n'.join(line.rstrip() for line in text.splitlines())+'\n').encode('utf-8'))

helpers=fragment('function settlementBlend410(','function installSettlement(')
helpers=helpers[:helpers.index('function findSettlementSite(')]+"const NO_SETTLEMENT_SITE=Object.freeze({x:1e30,z:1e30,y:0,yaw:0,clearRadius:0,softRadius:0,haloRadius:0});\nfunction findSettlementSite(field,b){return field.c.settlementSite||NO_SETTLEMENT_SITE;}\n"+helpers[helpers.index('function settlementInfluence('):]
terrain='// Native Bioma Lab V4.1.10.3 generator; gameplay supplies the persisted village site.\nconst clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;\n'
terrain+=fragment('const smooth=','const BIOMES=')+'const num=v=>Number(v.toFixed(4));\n'+helpers+fragment('function canyonFrame(','function mm(')
terrain+='export {TerrainField,scatterWorld,hashString,hashCell,noise,rand,SLOTS,GROUPS,hex,canyonFrame,canyonGroundColor,desertGroundColor};\n'
write('src/world/terrain.js',terrain)

mask=fragment('function groundWear417(','function setGround417(')
mask=mask.replace('const s=findSettlementSite(field,b),','const s=field.c.settlementSite;if(!s)return 0;const ')
pre="import {noise} from '../world/terrain.js';\nconst clamp=(v,a,b)=>Math.max(a,Math.min(b,v));\nconst smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};\n"
write('src/rendering/ground-mask.js','// Extracted from Bioma Lab V4.1.10.3.\n'+pre+mask+'export {groundWear417,groundSample417,buildGroundMask417};\n')
profiles=json.loads(source.split('const GROUND417_BIOME_TILES=Object.freeze(',1)[1].split(');',1)[0])
payload={p['id']:p['url'] for p in record['payloads'] if 'url' in p}
for tile in profiles.values():
    for role in ['base','normal','arh']:
        if role in tile:tile[role]=payload[tile[role]]
baked=root/'content/manifests/mangrove-ground-bake.json'
if baked.exists():
    for role,item in json.loads(baked.read_text(encoding='utf8'))['maps'].items():
        assert hashlib.sha256((root/'public'/item['url'].lstrip('/')).read_bytes()).hexdigest()==item['sha256']
        profiles['mangrove'][role]=item['url']
    data=json.loads(baked.read_text(encoding='utf8'))
    profiles['mangrove']['pureMoss']=data['schema']>=3
    if data['schema']>=3:profiles['mangrove']['mudPatches']={**{role:item['url'] for role,item in data['mudMaps'].items()},'scale':profiles['mangrove']['scale']}
    profiles['mangrove']['name']='Moss002 · musgo puro con barro independiente'
write('public/content/ground-materials.json',json.dumps(profiles,ensure_ascii=False,separators=(',',':')))

shader=fragment('// Material-only experiment V4.1.8.','const float PI4=')
shader=shader.replace('vWorld','worldP').replace('uCamera','cameraPosition').replace('uCanyon','(uBiome>3.5&&uBiome<4.5?1.:0.)').replace('uDesert','(uBiome>4.5?1.:0.)').replace('uDetail','uGroundDetail')
shader=shader.replace('uGroundMask,uGroundDetail,uGroundNormal','uGroundMask,uGroundDetailMap,uGroundNormal').replace('textureGrad(uGroundDetail,','textureGrad(uGroundDetailMap,')
uv='(uGroundSeed+mod(mat2(.8,-.6,.6,.8)*uWorldOrigin*uGroundParams.x,1.))'
shader=shader.replace('uGroundUVOrigin',uv).replace('uniform vec2 '+uv+';','uniform vec2 uGroundSeed;')
shader=shader.replace('materialNoise(worldP*.32)','materialNoise(worldPatternPosition(worldP)*.32)').replace('materialNoise(worldP*2.6)','materialNoise(worldPatternPosition(worldP)*2.6)')
shader=shader.replace('vec3(worldP.x*.095,0.,worldP.z*.095)','vec3(worldPatternPosition(worldP).x*.095,0.,worldPatternPosition(worldP).z*.095)').replace('vec3(worldP.x*.028+19.7,0.,worldP.z*.028-11.4)','vec3(worldPatternPosition(worldP).x*.028+19.7,0.,worldPatternPosition(worldP).z*.028-11.4)').replace('sin(worldP.z*.024)','sin(worldPatternPosition(worldP).z*.024)')
pure_moss="""
 if(uGroundPureMoss>.5){
  vec2 uv=mat2(.8,-.6,.6,.8)*worldP.xz*uGroundParams.x+uGroundSeed+mod(mat2(.8,-.6,.6,.8)*uWorldOrigin*uGroundParams.x,1.);
  vec2 dx=dFdx(uv),dy=dFdy(uv);
  vec3 tex=textureGrad(uGroundDetailMap,uv,dx,dy).rgb;
  vec3 mapN=textureGrad(uGroundNormal,uv,dx,dy).rgb*2.-1.;
  vec3 arh=textureGrad(uGroundARH,uv,dx,dy).rgb;
  float fade=1.-smoothstep(.12,.60,max(length(dFdx(worldP)),length(dFdy(worldP))));
  color=tex*vec3(1.,1.03,.96);N=sampleTurfN410(Ng,mapN,uGroundParams.z*uGroundMicro*fade);
  rough=clamp(arh.g,.5,.99);wet=0.;materialAO410=mix(.45,1.,arh.r);materialCover410=1.;return;
 }
"""
shader=shader.replace('uniform float uGroundDebug,uGroundRelief;','uniform float uGroundDebug,uGroundRelief,uGroundPureMoss;')
marker='void groundMaterial417(vec3 worldP,vec3 Ng,inout vec3 color,inout vec3 N,inout float rough,inout float wet){'
assert marker in shader
shader=shader.replace(marker,marker+pure_moss)
art=fragment('float artStep416(','float toonRamp4(')
art=art.replace('bool ground=uTextured<.5&&uSurfaceType<.5;','bool ground=uSurfaceType<.5;').replace('uTextured>.5','uSurfaceType>.5').replace('uVolcanicGlow','uArtVolcanicGlow').replace('uHighlight','uArtHighlight')
art_profiles=json.loads(source.split('const ART416_PROFILES=Object.freeze(',1)[1].split(');',1)[0])
output='// Native recipes from Bioma Lab V4.1.10.3; renderer bindings adapted.\n'
for name,data in [('BIOME_LAB_SHA256',record['sha256']),('groundMaterialFunctions',shader),('artLightingFunctions',art),('ART_PROFILES',art_profiles)]:output+='export const '+name+'='+json.dumps(data)+';\n'
write('src/rendering/biome-material-source.js',output)
print('V4.1.10.3 map, context masks, ground maps and illustrated material recipes prepared')
