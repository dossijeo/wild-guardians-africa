"""Port the audited opaque crop growth/morph shaders, without the lab's cap/UI."""
import pathlib
root=pathlib.Path(__file__).resolve().parents[1]
if (root/'content/manifests/crops-v4.json').exists():
    raise SystemExit('CULT V4 uses tools/bake_crops_lab_v4.mjs; legacy V3 regeneration would discard authored repairs and baked bridges.')
s=(root/'references/extracted/Bioma_Cultivos_Lab_V3_Morph_Local/script-4.js').read_text(encoding='utf-8')
shader=s[s.index('const GROWTH_DECL='):s.index('function cycleDuration(')]
shader=shader.replace('const i=meta.cropIndex*5+meta.stage-1,geo=o.geometry;','const i=meta.cropIndex*5+meta.stage-1,geo=o.geometry.clone();')
window=s[s.index('function transitionWindow('):s.index('function syncGrowthSettings(')]
sampling=s[s.index('function writeBridge('):s.index('function buildInstances(')]
sampling=sampling.replace('tmpObj.position.set(plant.x,0,plant.z)','tmpObj.position.set(plant.x,plant.y||0,plant.z)')
prefix="""// Generated adaptation of CULT V3. Exact regional opaque bridge, original UVs.
import * as THREE from 'three';
import {cropSpec} from '../simulation/rules.js';
const ids=['maiz','algodon','girasol','platano','sorgo','mijo','yuca','batata'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const MARKS=[.065,.27,.53,.78,1];
export function createCropBatch(scene,renderer,gltf,bridgeData,MAX_PLANTS=128) {
 const state={morphSeconds:2};
 let models=[],bridges=[],counts=new Uint32Array(40),bridgeCounts=new Uint32Array(32);
 const uniforms={clock:{value:0},wind:{value:1}},tmpObj=new THREE.Object3D();
 const cycleDuration=crop=>cropSpec(ids[crop]).growth_seconds;
"""
suffix="""
 prepareModels(gltf);prepareBridges(bridgeData);
 return {
  capacity:MAX_PLANTS,
  update(plants,clock,ground) {
   uniforms.clock.value=clock;counts.fill(0);bridgeCounts.fill(0);
   for(const entity of plants){
    const p={...entity,crop:ids.indexOf(entity.species),growth:entity.growth/cropSpec(entity.species).growth_seconds,y:ground(entity.x,entity.z),seed:Number(entity.id.replace(/\\D/g,''))||0};
    const sample=stageSample(p.crop,p.growth);
    for(const part of sample.items)writeInstance(part.index,p,part);
    if(sample.bridge)writeBridge(sample.bridge.index,p,sample.bridge);
   }
   for(let i=0;i<models.length;i++){const m=models[i];m.mesh.count=counts[i];m.mesh.visible=counts[i]>0;if(counts[i]){m.mesh.instanceMatrix.needsUpdate=true;m.growthAttr.needsUpdate=true;}}
   for(let i=0;i<bridges.length;i++){const b=bridges[i];b.mesh.count=bridgeCounts[i];b.mesh.visible=bridgeCounts[i]>0;if(bridgeCounts[i]){b.mesh.instanceMatrix.needsUpdate=true;b.attr.needsUpdate=true;}}
  },
  dispose(){for(const model of [...models,...bridges]){scene.remove(model.mesh);model.geo.dispose();model.mesh.material.dispose();model.mesh.customDepthMaterial?.dispose();}},
  sample:(id,growth)=>stageSample(ids.indexOf(id),growth/cropSpec(id).growth_seconds)
 };
}
"""
(root/'src/rendering/crop-batch.js').write_text(prefix+shader+window+sampling+suffix,encoding='utf-8')
print('Original opaque crop growth/morph adapter generated')
