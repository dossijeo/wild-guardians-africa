// QA only. Call before AfricanToon/registry decoration; never owns geometry.
export const workerFrontsideNames = Object.freeze(['Prop_FruitCrate_geometry_7','Prop_FruitCrate_geometry_8','Prop_FruitCrate_geometry_9','Prop_Hoe_geometry_23','Prop_Hoe_geometry_24']);
export function installWorkerFrontsidePilot(root,{frontSide=0,doubleSide=2,shadowFront=false}={}){
 const selected=new Set(workerFrontsideNames),entries=[],owned=new Set(),clones=new Map();let released=false;
 const meshes=[];root.traverse(mesh=>{if(mesh.isMesh&&selected.has(mesh.name))meshes.push(mesh);});
 if(meshes.length!==workerFrontsideNames.length)throw Error('Incomplete rigid pilot');
 for(const mesh of meshes)if(mesh.isSkinnedMesh||Array.isArray(mesh.material)||mesh.material.side!==doubleSide)throw Error('Unexpected pilot source: '+mesh.name);
 for(const mesh of meshes){
  const source=mesh.material;
  if(!clones.has(source)){
   const material=source.clone();material.side=frontSide;material.shadowSide=shadowFront?frontSide:doubleSide;
   material.defines={...source.defines,DOUBLE_SIDED:''};
   const originalKey=source.customProgramCacheKey.bind(source),compile=source.onBeforeCompile;
   material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);};
   material.customProgramCacheKey=()=>originalKey()+'|qa-worker-rigid-front-preserve-double-v1';
   material.needsUpdate=true;clones.set(source,material);owned.add(material);
  }
  entries.push({mesh,source,geometry:mesh.geometry,candidate:clones.get(source)});mesh.material=clones.get(source);
 }
 if(entries.length!==workerFrontsideNames.length){for(const e of entries)e.mesh.material=e.source;for(const m of owned)m.dispose();throw Error('Incomplete rigid pilot');}
 return {entries,owned,setEnabled(enabled){if(released)throw Error('Released pilot');for(const e of entries){if(e.mesh.geometry!==e.geometry)throw Error('Borrowed geometry changed');e.mesh.material=enabled?e.candidate:e.source;}},
  release(){if(released)return;released=true;for(const e of entries)e.mesh.material=e.source;for(const material of owned)material.dispose();owned.clear();},
  get released(){return released;}};
}
