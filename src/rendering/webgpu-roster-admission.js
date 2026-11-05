// A roster retains ownership of an actor while its shared pipeline is being
// prepared. Aborting the entry disposes it immediately and prevents late work
// from publishing an entity that no longer exists.
export function disposePendingRosterActor(entry){
 const actor=entry.pendingActor;entry.pendingActor=null;actor?.dispose();
}

export async function admitRosterActor({actor,entry,isCurrent,pipelineAdmission,onReady}){
 if(!isCurrent()){actor.dispose();return;}
 entry.pendingActor=actor;
 try{
  if(pipelineAdmission){
   if(!actor.root?.isObject3D)throw Error('Actor admission requires a root');
   actor.root.visible=false;
   await pipelineAdmission.prepare(actor.root,{signal:entry.controller.signal,include:actor.admissionObjects?.()??[]});
  }
  if(!isCurrent())return;
  actor.update();entry.pendingActor=null;entry.actor=actor;
  try{onReady();}catch(error){entry.actor=null;actor.dispose();throw error;}
 }finally{if(entry.pendingActor===actor)disposePendingRosterActor(entry);}
}
