// Snapshot an already-stepped Rapier ragdoll without advancing the solver or
// mutating the live animation binding. Recovery, baked fallback and exit blends
// have stateful samplers and deliberately fail closed until they have a pure
// equivalent. `at` is the completed simulation tick, never a wall-clock time.
export function snapshotWorkerRapierPoses({game,nav,manager,loaded,at}={}){
 if(!game||!Number.isFinite(at)||at!==game.elapsed||typeof nav?.actorSurface!=='function'||!(manager?.entries instanceof Map)||!(manager?.baked?.entries instanceof Map)||!Array.isArray(loaded))throw TypeError('Invalid post-step physics snapshot');
 if(manager.baked.entries.size||loaded.some(({rig})=>rig?.recoveryExit))return {version:1,at,complete:false,reason:'stateful-physics-pose',poses:[]};
 const loadedById=new Map(loaded.map(item=>[item.animal?.id,item]));if(loadedById.size!==loaded.length||[...manager.entries.keys()].some(id=>!loadedById.has(id)))return {version:1,at,complete:false,reason:'missing-physics-rig',poses:[]};
 if([...manager.entries.values()].some(entry=>entry.recovery||!entry.binding||!entry.actor?.pose))return {version:1,at,complete:false,reason:'stateful-physics-pose',poses:[]};
 const transform=node=>[...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray()],poses=[],bounds=[];
 for(const [id,entry] of manager.entries){
  const {animal,root,rig}=loadedById.get(id),model=rig.model,binding=entry.binding;if(!game.raid?.animals?.includes(animal))return {version:1,at,complete:false,reason:'missing-physical-actor',poses:[]};
  // Shape-local bounding spheres are rotation invariant. A screen-time pose
  // is held until the next confirmed tick; this bounds every collider in it.
  const parts=entry.actor.parts;if(!Array.isArray(parts)||!parts.length)return {version:1,at,complete:false,reason:'missing-collider-bounds',poses:[]};const box={actorId:id,minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
  for(const part of parts){const collider=part.body?.collider?.(0),type=collider?.shapeType?.(),center=collider?.translation?.(),skin=collider?.contactSkin?.();let radius=NaN;if(type===2)radius=collider.halfHeight()+collider.radius();else if(type===9){const vertices=collider.vertices();if(vertices?.length>=12&&vertices.length%3===0){radius=0;for(let i=0;i<vertices.length;i+=3)radius=Math.max(radius,Math.hypot(vertices[i],vertices[i+1],vertices[i+2]));}}if(!center||![center.x,center.z,radius,skin].every(Number.isFinite)||radius<=0||skin<0)return {version:1,at,complete:false,reason:'unsupported-collider-bounds',poses:[]};radius+=skin;box.minX=Math.min(box.minX,center.x-radius);box.maxX=Math.max(box.maxX,center.x+radius);box.minZ=Math.min(box.minZ,center.z-radius);box.maxZ=Math.max(box.maxZ,center.z+radius);}
  bounds.push(box);
  const savedRoot=transform(root),savedBinding=binding.checkpoint();
  try{
   binding.restore();root.position.set(animal.x,nav.actorSurface(animal.x,animal.z),animal.z);root.updateMatrixWorld(true);binding.apply(entry.actor.pose);root.updateMatrixWorld(true);
   const bones=[];model.traverse(node=>{if(node.isBone)bones.push({name:node.name,transform:transform(node)});});poses.push({actorId:id,root:transform(root),model:transform(model),bones,active:true});
  }finally{root.position.fromArray(savedRoot,0);root.quaternion.fromArray(savedRoot,3);root.scale.fromArray(savedRoot,7);binding.restoreCheckpoint(savedBinding);root.updateMatrixWorld(true);}
 }
 return {version:1,at,complete:true,poses,bounds};
}
