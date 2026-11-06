import {createConfirmedHudDeltaEncoder} from './confirmed-hud-delta.js';
import {validateConfirmedHudSchema} from './confirmed-hud-projection.js';
import {copyPublication} from './confirmed-snapshot-handoff.js';

// Called only after the host publication queue has selected what will be
// sent. Thus each delta is based on the preceding transmitted HUD, rather
// than on an intermediate publication discarded by coalescing.
export function createMainThreadHudDeltaEncoder(){
 const encoder=createConfirmedHudDeltaEncoder({validate:validateConfirmedHudSchema});
 return {encode(message,{omitSnapshot=false}={}){
  if(typeof omitSnapshot!=='boolean')throw TypeError('Invalid HUD transport option');
  if(message?.kind!=='publication'||message.publication?.hudProjection===undefined)return message;
  const publication=message.publication;if(publication.sequence!==publication.hudProjection?.sequence)throw Error('HUD publication sequence mismatch');const delta=encoder.encode(publication.hudProjection);
  return {...message,publication:copyPublication(publication,{omit:['hudProjection',...(omitSnapshot?['snapshot','snapshotDelta']:[])],add:{hudDelta:delta}})};
 },reset(){encoder.reset();}};
}
