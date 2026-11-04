const validTransform=value=>Array.isArray(value)&&value.length===10&&value.every(Number.isFinite);
// Validate the whole publication before reconciling state or mutating rigs.
// Inactive poses are validated too, but they do not take presentation control.
export function confirmedAnimalPoses(message,snapshot){
 if(!Object.hasOwn(message,'physicsPose'))throw TypeError('Missing confirmed physics pose');
 const poses=message.physicsPoses??(message.physicsPose?[message.physicsPose]:[]);
 if(!Array.isArray(poses)||message.physicsPoses&&(!poses.length||JSON.stringify(poses[0])!==JSON.stringify(message.physicsPose)))throw TypeError('Invalid confirmed pose publication');
 const actors=new Map((snapshot.raid?.animals??[]).map(animal=>[animal.id,animal])),result=new Map(),seen=new Set();
 for(const pose of poses){
  if(!pose||typeof pose.actorId!=='string'||!pose.actorId||seen.has(pose.actorId)||typeof pose.active!=='boolean'||!validTransform(pose.root)||!validTransform(pose.model)||!Array.isArray(pose.bones)||pose.bones.some(b=>typeof b?.name!=='string'||!validTransform(b.transform)))throw TypeError('Invalid confirmed animal pose');
  seen.add(pose.actorId);if(!pose.active)continue;if(!actors.get(pose.actorId)?.magicDown)throw Error('Confirmed pose lacks active animal');result.set(pose.actorId,pose);
 }
 return result;
}
