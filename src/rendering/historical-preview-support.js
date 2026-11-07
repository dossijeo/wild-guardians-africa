import {historicalInactiveActor} from '../simulation/historical-inactive-actors.js';

// A certificate and its preview may be distinct objects. Cache the exact
// observed trace, not only the timestamps, and always revalidate terrain.
export function createHistoricalPreviewSupportSelector({motionFeed,terrainSupport,diagnostics=false}={}){
 if(typeof motionFeed?.getPreviewSupport!=='function'||typeof motionFeed?.getPreview!=='function'||typeof terrainSupport?.prepare!=='function')throw TypeError('Invalid historical support selector');
 let key=null,cached=null,lastFailure=null;
 const reject=(preview,reason)=>{if(diagnostics)lastFailure={preview,reason};return null;};
 const select=preview=>{
  if(!preview?.trace||!Number.isSafeInteger(preview.sequence)||!Number.isFinite(preview.start)||!Number.isFinite(preview.end))return null;
  const next=JSON.stringify([preview.sequence,preview.start,preview.end,preview.trace]);
  if(key===next&&cached?.valid()===true)return cached;
  key=null;cached=null;
  const full=motionFeed.getPreview(),support=motionFeed.getPreviewSupport();
  if(support&&full&&JSON.stringify([full.sequence,full.start,full.end,full.trace])===next&&support.valid()===true){key=next;cached=support;return support;}
  if(preview.safeForAutonomousPlayback!==false||!Array.isArray(preview.reasons)||preview.reasons.length!==1||preview.reasons[0]!=='visual-time-and-support-unverified'||!Array.isArray(preview.trace.actors))return reject(preview,'invalid-preview');
  const actorIds=preview.trace.actors.filter(actor=>!historicalInactiveActor(actor,preview.trace.actorTickStates,preview.start,preview.end)).map(actor=>actor.actorId),value=terrainSupport.prepare(preview,{actorIds});
  if(!value)return reject(preview,'prepare-rejected');
  if(typeof value.valid!=='function'||value.sequence!==preview.sequence||value.start!==preview.start||value.end!==preview.end||value.valid()!==true)return reject(preview,'invalid-prepared-support');
  key=next;cached=value;return value;
 };
 if(diagnostics)select.audit=()=>lastFailure?{reason:lastFailure.reason,preview:structuredClone(lastFailure.preview),terrain:terrainSupport.audit?.(lastFailure.preview)??null}:null;
 return select;
}
