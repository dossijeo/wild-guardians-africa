// Diagnostic only: pairwise articulated collider distances, sampled at 10 Hz.
// Excludes baked actors (no Rapier colliders); never use this as skin clearance.
export function sampleRecoveryPeerContacts(manager){
 const entries=[...manager.entries.values()],pairs=[];
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const a=entries[i],b=entries[j];if(!a.recovery&&!b.recovery)continue;
  let minimum=0,contacts=0,parts=null;
  for(let ai=0;ai<a.actor.parts.length;ai++)for(let bi=0;bi<b.actor.parts.length;bi++){
   const contact=a.actor.parts[ai].body.collider(0).contactCollider(b.actor.parts[bi].body.collider(0),0);
   if(!contact||contact.distance>=0)continue;
   contacts++;if(contact.distance<minimum){minimum=contact.distance;parts=[ai,bi];}
  }
  pairs.push({a:a.animal.id,b:b.animal.id,recovering:[!!a.recovery,!!b.recovery],contacts,minimum,parts});
 }
 return pairs;
}
