import {validateConfirmedClockSegments} from '../simulation/confirmed-clock-segments.js';
import {certifyHistoricalSeparation} from '../simulation/worker-historical-separation.js';

// Subsets are observations, not new certificates. Every actor endpoint must be
// an authority tick and no movement segment may straddle either cut.
export function sliceHistoricalPreview(preview,start,end){
 try{
  const trace=preview?.trace,clock=preview?.clockSegments;
  if(!trace||!Number.isFinite(start)||!Number.isFinite(end)||start<preview.start||end>preview.end||start>=end||trace.start!==preview.start||trace.end!==preview.end||preview.safeForAutonomousPlayback!==false||!Array.isArray(preview.reasons)||preview.reasons.some(reason=>!['events','visual-time-and-support-unverified'].includes(reason))||!preview.reasons.includes('visual-time-and-support-unverified')||trace.rosterChanged!==false||trace.topologyChanged!==false||trace.chunkChanged!==false||trace.terrainChanged!==false||trace.physicsActivity?.samplesComplete!==true||trace.physicsActivity.observed!==false||trace.physicsPoseSamples!==undefined||!Array.isArray(trace.actors)||!trace.actors.length||trace.actorTickStates?.complete!==true||!Array.isArray(trace.actorTickStates.actors)||trace.actorTickStates.actors.length!==trace.actors.length||!clock?.complete||clock.startPauses?.length||clock.endPauses?.length)return null;
  validateConfirmedClockSegments(clock,{start:preview.start,end:preview.end,startPauses:[],endPauses:[]});
  const spatial=trace.spatialEvidence,separation=trace.separationEvidence;
  if(!spatial||spatial.version!==1||spatial.start!==preview.start||spatial.end!==preview.end||spatial.actors!==trace.actors.length||spatial.segments!==trace.actors.reduce((n,actor)=>n+Math.max(1,actor.segments?.length??0),0)||!spatial.revisions||!['topology','chunks','terrain','payloads'].every(k=>Number.isSafeInteger(spatial.revisions[k])&&spatial.revisions[k]>=0)||!separation||!(separation.version===1||separation.version===2&&separation.existingSeparationChecked===true)||separation.start!==preview.start||separation.end!==preview.end||separation.actors!==trace.actors.length||!['none','swing-clear'].includes(separation.gates))return null;
  const ticks=new Map();for(const item of trace.actorTickStates.actors){if(typeof item?.actorId!=='string'||ticks.has(item.actorId)||!Array.isArray(item.samples))return null;ticks.set(item.actorId,item.samples);}
  const slicedTicks=[],actors=[],ids=new Set();
  for(const actor of trace.actors){
   if(typeof actor?.actorId!=='string'||!actor.actorId||ids.has(actor.actorId)||actor.continuous!==true||actor.timed!==true||!Array.isArray(actor.segments))return null;ids.add(actor.actorId);
   const samples=ticks.get(actor.actorId);if(!samples||samples.some((s,i)=>!Number.isFinite(s?.at)||i&&s.at<=samples[i-1].at))return null;const first=samples.findIndex(s=>s.at===start),last=samples.findIndex(s=>s.at===end);if(first<0||last<=first)return null;
   const selected=samples.slice(first,last+1),a=selected[0],b=selected.at(-1);if(![a.x,a.z,b.x,b.z].every(Number.isFinite)||typeof a.status!=='string'||typeof b.status!=='string')return null;
   const segments=[];for(const seg of actor.segments){if(![seg?.t0,seg?.t1,seg?.x0,seg?.x1,seg?.z0,seg?.z1].every(Number.isFinite)||seg.t1<=seg.t0)return null;if(seg.t0<start&&seg.t1>start||seg.t0<end&&seg.t1>end)return null;if(seg.t0>=start&&seg.t1<=end)segments.push(structuredClone(seg));}
   actors.push({...structuredClone(actor),start:{at:start,x:a.x,z:a.z},end:{at:end,x:b.x,z:b.z},startStatus:a.status,endStatus:b.status,segments});slicedTicks.push({actorId:actor.actorId,samples:structuredClone(selected)});
  }
  const actorTickStates={...structuredClone(trace.actorTickStates),actors:slicedTicks};
  if(!certifyHistoricalSeparation(actors,start,end,{tickStates:actorTickStates,allowExistingSeparation:separation.version===2}))return null;
  let hyenaTickSamples;if(trace.hyenaTickSamples!==undefined){const h=trace.hyenaTickSamples;if(h?.complete!==true||!Array.isArray(h.actors))return null;const seen=new Set(),sliced=[];for(const entry of h.actors){if(typeof entry?.actorId!=='string'||seen.has(entry.actorId)||!ids.has(entry.actorId)||!Array.isArray(entry.samples)||entry.samples.some((v,i)=>!Number.isFinite(v?.at)||i&&v.at<=entry.samples[i-1].at))return null;seen.add(entry.actorId);const a=entry.samples.findIndex(s=>s.at===start),b=entry.samples.findIndex(s=>s.at===end);if(a<0||b<=a)return null;const selected=entry.samples.slice(a,b+1),actorSamples=slicedTicks.find(item=>item.actorId===entry.actorId)?.samples;if(!actorSamples||selected.length!==actorSamples.length||selected.some((sample,index)=>sample.at!==actorSamples[index].at))return null;sliced.push({...structuredClone(entry),samples:structuredClone(selected)});}hyenaTickSamples={...structuredClone(h),actors:sliced};}
  const segments=[];for(const seg of clock.segments){const a=Math.max(start,seg.start),b=Math.min(end,seg.end);if(b>a)segments.push({...structuredClone(seg),start:a,end:b,realDuration:(b-a)/seg.rate});}
  const slicedClock={...structuredClone(clock),start,end,segments};validateConfirmedClockSegments(slicedClock,{start,end,startPauses:[],endPauses:[]});
  const slicedTrace={...structuredClone(trace),start,end,actors,actorTickStates,...(hyenaTickSamples?{hyenaTickSamples}:{}),spatialEvidence:{...structuredClone(spatial),start,end,segments:actors.reduce((n,actor)=>n+Math.max(1,actor.segments.length),0)},separationEvidence:{...structuredClone(separation),start,end}};
  const result={...structuredClone(preview),start,end,trace:slicedTrace,clockSegments:slicedClock,safeForAutonomousPlayback:false};delete result.certificates;delete result.workerHeadingProof;return result;
 }catch{return null;}
}
