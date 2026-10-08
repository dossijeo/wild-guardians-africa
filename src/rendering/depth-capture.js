// Only authored depth shaders with matching silhouettes opt into this pass.
// Unknown vertex/discard recipes keep their color shader until audited.
import {standardDepthMaterial} from './standard-depth.js';
import * as THREE from 'three';
import {nativeDepthRecipe} from './depth-recipes.js';
function emptyRenderable(object){
  const geometry=object.geometry;
  if(!geometry||!(geometry.drawRange.count===0||(object.isInstancedMesh?object.count===0:geometry.isInstancedBufferGeometry&&geometry.instanceCount===0)))return false;
  // An unknown render/compile hook can populate a nominally empty batch during
  // the draw. Keep its original preparation and callbacks conservatively.
  if(object.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender||object.onAfterRender!==THREE.Object3D.prototype.onAfterRender)return false;
  const sources=Array.isArray(object.material)?object.material:[object.material];
  return sources.every(m=>m?.onBeforeRender===THREE.Material.prototype.onBeforeRender&&nativeDepthRecipe(m))&&
    (!object.customDepthMaterial||object.customDepthMaterial.onBeforeRender===THREE.Material.prototype.onBeforeRender&&nativeDepthRecipe(object.customDepthMaterial));
}
export function withDepthCaptureMaterials(world, render, {optimized=true,visibleOnly=true,nonEmptyOnly=false,stockAlpha=false,materialArrays=false}={}) {
  const materials=new Map(),standards=new Map(),objects=[],stats={specialized:0,fallback:0,excluded:0,emptySkipped:0,stockAlphaSpecialized:0};
  const skipEmpty=nonEmptyOnly&&!world.overrideMaterial&&world.onBeforeRender===THREE.Object3D.prototype.onBeforeRender&&world.onAfterRender===THREE.Object3D.prototype.onAfterRender;
  const remember=material=>{if(material&&!materials.has(material))materials.set(material,{visible:material.visible,colorWrite:material.colorWrite});};
  const compatible=(source,depth)=>depth?.userData.worldDepthCompatible&&
    source.side===depth.side&&source.depthFunc===depth.depthFunc&&source.depthTest===depth.depthTest&&
    Boolean(source.alphaToCoverage)===Boolean(depth.alphaToCoverage)&&
    !source.polygonOffset&&!depth.polygonOffset&&!source.alphaHash&&
    Boolean(source.wireframe)===Boolean(depth.wireframe)&&
    source.displacementMap===depth.displacementMap&&
    !(source.clippingPlanes?.length)&&!(depth.clippingPlanes?.length)&&
    (!source.alphaTest||source.alphaTest===depth.alphaTest&&source.map===depth.map&&source.alphaMap===depth.alphaMap);
  try {
    // Three skips invisible subtrees before projecting renderables. Preparing
    // their materials cannot affect this pass; shared visible materials still
    // participate through their visible owners and are restored below.
    world[visibleOnly?'traverseVisible':'traverse'](object=>{
      if(!object.material)return;
      // Return only from this visitor: children still participate. Shared
      // materials are prepared through every nonempty owner as before.
      if(skipEmpty&&!(materialArrays&&object.customWorldDepthMaterial)&&emptyRenderable(object)){stats.emptySkipped++;return;}
      const source=object.material,list=Array.isArray(source)?source:[source];
      list.forEach(remember);
      let candidate=null,accepted=false;
      // Experimental grouped route is all-or-nothing. Unknown groups retain
      // their complete color recipe; never silently discard an unaudited group.
      // An explicit world-depth recipe is separate from Three's shadow depth.
      const grouped=Array.isArray(source),authored=materialArrays&&object.customWorldDepthMaterial||object.customDepthMaterial;
      if(optimized&&!world.overrideMaterial&&(grouped?materialArrays&&list.length&&list.every(m=>m.visible&&!m.transparent&&m.depthWrite):source.visible&&!source.transparent&&source.depthWrite)){
        if(authored){
          accepted=grouped?list.every(m=>compatible(m,authored)):compatible(source,authored);
          // Keep material-index groups and uncovered index gaps. A scalar
          // replacement would draw the entire geometry instead of its groups.
          candidate=grouped?list.map(()=>authored):authored;
        }
        // Keep textured alpha silhouettes on their native recipe until combined
        // biome readbacks prove equivalence; authored crop depths remain eligible.
        else if(grouped?list.every(m=>!m.alphaTest||stockAlpha):!source.alphaTest||stockAlpha){
          // Source properties cannot change before the draw callback. Share this
          // decision only within this capture, with the existing recipe lookup.
          if(grouped){
            const entries=list.map(material=>{
              let entry=standards.get(material);
              if(!entry){const depth=standardDepthMaterial(material);entry={depth,accepted:Boolean(depth&&compatible(material,depth))};standards.set(material,entry);}
              return entry;
            });
            candidate=entries.map(entry=>entry.depth);accepted=entries.every(entry=>entry.accepted);
          }else{
            let entry=standards.get(source);
            if(!entry){const depth=standardDepthMaterial(source);entry={depth,accepted:Boolean(depth&&compatible(source,depth))};standards.set(source,entry);}
            candidate=entry.depth;accepted=entry.accepted;
          }
        }
      }
      if(accepted){
        const depth=candidate;if(Array.isArray(depth)){for(const material of depth){remember(material);material.visible=true;}}
        else{remember(depth);depth.visible=true;}
        objects.push([object,source]);object.material=depth;stats.specialized++;
        if(stockAlpha&&list.some(m=>m.alphaTest)&&!authored)stats.stockAlphaSpecialized++;
      } else if(list.some(m=>!m.transparent&&m.depthWrite))stats.fallback++;
      else stats.excluded++;
    });
    remember(world.overrideMaterial);
    for(const material of materials.keys()){material.colorWrite=false;if(material.transparent||!material.depthWrite)material.visible=false;}
    render(stats);
    return stats;
  } finally {
    for(const [object,source] of objects)object.material=source;
    for(const [material,saved] of materials)Object.assign(material,saved);
  }
}
