// Removing a cancelled actor is immediate; its rig and shared-asset lease
// stay alive while a compilation still uses its root.
export function releaseRosterActor(actor,pipelineAdmission){
 if(!actor)return;actor.root?.removeFromParent?.();
 if(actor.root?.isObject3D&&typeof pipelineAdmission?.deferRelease==='function')pipelineAdmission.deferRelease(actor.root,()=>actor.dispose());else actor.dispose();
}
export function disposePendingRosterActor(entry,pipelineAdmission){
 const actor=entry.pendingActor;entry.pendingActor=null;releaseRosterActor(actor,pipelineAdmission);
}

export async function admitRosterActor({actor,entry,isCurrent,pipelineAdmission,onReady}){
 if(!isCurrent()){actor.dispose();return;}
 entry.pendingActor=actor;
 try{
  const publish=()=>{
   if(!isCurrent())return;
   actor.update();entry.pendingActor=null;entry.actor=actor;
   try{onReady();}catch(error){entry.actor=null;releaseRosterActor(actor,pipelineAdmission);throw error;}
  };
  if(pipelineAdmission){
   if(!actor.root?.isObject3D)throw Error('Actor admission requires a root');
   actor.root.visible=false;
   const options={signal:entry.controller.signal,include:actor.admissionObjects?.()??[]};
   if(typeof pipelineAdmission.prepareAndPublish==='function')await pipelineAdmission.prepareAndPublish(actor.root,options,publish);
   else{await pipelineAdmission.prepare(actor.root,options);publish();}
  }else publish();
 }finally{if(entry.pendingActor===actor)disposePendingRosterActor(entry,pipelineAdmission);}
}
