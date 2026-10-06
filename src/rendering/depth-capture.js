// Only authored depth shaders with matching silhouettes opt into this pass.
// Unknown vertex/discard recipes keep their color shader until audited.
import {standardDepthMaterial} from './standard-depth.js';
export function withDepthCaptureMaterials(world, render, {optimized=true,visibleOnly=true}={}) {
  const materials=new Map(),standards=new Map(),objects=[],stats={specialized:0,fallback:0,excluded:0};
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
      const source=object.material,list=Array.isArray(source)?source:[source];
      list.forEach(remember);
      let candidate=null;
      if(optimized&&!world.overrideMaterial&&!Array.isArray(source)&&source.visible&&!source.transparent&&source.depthWrite){
        if(object.customDepthMaterial)candidate=object.customDepthMaterial;
        // Keep textured alpha silhouettes on their native recipe until combined
        // biome readbacks prove equivalence; authored crop depths remain eligible.
        else if(!source.alphaTest){if(!standards.has(source))standards.set(source,standardDepthMaterial(source));candidate=standards.get(source);}
      }
      if(candidate&&compatible(source,candidate)){
        const depth=candidate;remember(depth);depth.visible=source.visible;
        objects.push([object,source]);object.material=depth;stats.specialized++;
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
