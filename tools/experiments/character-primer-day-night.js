import {renderScreenPreload} from '../../src/rendering/screen-preload.js';

// Synchronous QA comparison of the same submitted meshes with day/night light
// uniforms. It does not emulate every time-dependent gameplay effect.
export function comparePrimerDayNight(world,root,camera){
 const {renderer,scene,toon,sun,ambient}=world,gl=renderer.getContext(),meshes=[],saved=[],hooks=[],rows={day:[],night:[]};
 const inRoot=new Set();root.traverse(object=>inRoot.add(object));
 scene.traverseVisible(object=>{if(object.isMesh||object.isLine||object.isPoints){meshes.push(object);saved.push(object.visible);}});
 let phase='day';
 root.traverse(mesh=>{if(!mesh.isMesh)return;let owner=mesh;while(owner&&!owner.userData.qaPrimerLabel)owner=owner.parent;if(!owner)return;const previous=mesh.onAfterRender,label=owner.userData.qaPrimerLabel;
  mesh.onAfterRender=function(...args){previous.apply(this,args);if(args[2]!==camera)return;const material=args[4],program=renderer.properties.get(material).currentProgram;rows[phase].push({label,mesh:mesh.name,material:material.name,program:program?.cacheKey??null});};hooks.push(()=>mesh.onAfterRender=previous);
 });
 const textures=new Map();root.traverse(mesh=>{if(mesh.isSkinnedMesh&&mesh.skeleton.boneTexture){const texture=renderer.properties.get(mesh.skeleton.boneTexture).__webglTexture;if(texture)textures.set(texture,'bone');}if(mesh.isMesh)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])for(const value of Object.values(material))if(value?.isTexture){const texture=renderer.properties.get(value).__webglTexture;if(texture&&!textures.has(texture))textures.set(texture,'material');}});
 const names=['createProgram','linkProgram','texImage2D','texSubImage2D','compressedTexImage2D','bufferData'],counts={day:{},night:{}},textureUploads={day:{},night:{}},restore=[];
 for(const name of names){const original=gl[name];if(typeof original!=='function')continue;gl[name]=function(...args){counts[phase][name]=(counts[phase][name]??0)+1;if(name==='texSubImage2D'){const size=typeof args[4]==='number'?`${args[4]}x${args[5]}`:'image',bound=args[0]===gl.TEXTURE_2D?gl.getParameter(gl.TEXTURE_BINDING_2D):null,key=`${textures.get(bound)??'unknown'}:${size}`;textureUploads[phase][key]=(textureUploads[phase][key]??0)+1;}return original.apply(this,args);};restore.push(()=>gl[name]=original);}
 const initial={night:toon.uniforms.uNight.value,sun:sun.intensity,ambient:ambient.intensity,shadowAuto:renderer.shadowMap.autoUpdate,shadowNeeds:renderer.shadowMap.needsUpdate};
 const times={};
 try{
  meshes.forEach(mesh=>mesh.visible=inRoot.has(mesh));renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
  for(const [name,night] of [['day',0],['night',1]]){phase=name;toon.uniforms.uNight.value=night;sun.intensity=3-2.6*night;ambient.intensity=2-.9*night;const start=performance.now();renderScreenPreload(renderer,scene,camera,{pixels:true});times[name]=performance.now()-start;}
 }finally{
  meshes.forEach((mesh,index)=>mesh.visible=saved[index]);for(const reset of hooks)reset();for(const reset of restore)reset();toon.uniforms.uNight.value=initial.night;sun.intensity=initial.sun;ambient.intensity=initial.ambient;renderer.shadowMap.autoUpdate=initial.shadowAuto;renderer.shadowMap.needsUpdate=initial.shadowNeeds;
 }
 const keys=phase=>{const result={};for(const {label,mesh,material,program} of rows[phase]){const key=`${label}|${mesh}|${material}`;(result[key]??=[]).push(program);}for(const key of Object.keys(result))result[key]=JSON.stringify(result[key].sort());return result;};
 const day=keys('day'),night=keys('night'),all=new Set([...Object.keys(day),...Object.keys(night)]),differences=[...all].filter(key=>day[key]!==night[key]);
 return {counts,textureUploads,times,draws:{day:rows.day.length,night:rows.night.length},labels:{day:[...new Set(rows.day.map(row=>row.label))],night:[...new Set(rows.night.map(row=>row.label))]},programDifferences:differences,missingPrograms:[...all].filter(key=>!day[key]||!night[key]||JSON.parse(day[key]).includes(null)||JSON.parse(night[key]).includes(null))};
}
