// Automatic recovery bases already describe the live, independently streamed
// terrain. Do not rebuild it or advance the terrain channel's checkpoint: a
// publication for an older sequence may still be in transit on that channel.
// Explicit checkpoints retain the existing restore-and-validate behaviour.
export function acceptLiveTerrainCheckpoint(message,session,restore){
 const checkpoint=message?.terrainCheckpoint;
 if(!checkpoint||message.session!==session||checkpoint.sequence!==message.sequence||!Array.isArray(checkpoint.chunks)||typeof restore!=='function')throw TypeError('Invalid live terrain checkpoint');
 if(checkpoint.recoveryOnly!==true)return restore(message);
 const poses=message.physicsPoses??(message.physicsPose?[message.physicsPose]:[]);
 return {sequence:message.sequence,chunks:checkpoint.chunks.length,activePoses:poses.filter(p=>p?.active===true).length,restored:false};
}
