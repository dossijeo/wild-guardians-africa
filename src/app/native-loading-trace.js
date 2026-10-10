// Read-only attribution for an explicitly enabled native diagnostic run.
// No timers, render calls, GPU queries, resource inspection or readiness changes.
export function createNativeLoadingTrace({enabled=false,maxPending=64,maxLabels=128}={}){
 if(!enabled)return null;
 if(!Number.isInteger(maxPending)||maxPending<1||maxPending>256||!Number.isInteger(maxLabels)||maxLabels<1||maxLabels>512)throw Error('Invalid native trace limits');
 const pending=new Map(),summaries=new Map();let closed=false,droppedPending=0,droppedLabels=0;
 const labelOf=value=>typeof value==='string'?value.slice(0,96):null;
 const witness=span=>{
  if(closed)return;
  const label=labelOf(span?.label);
  if(!label||![span.start,span.end,span.duration].every(Number.isFinite)||span.duration<0)return;
  let summary=summaries.get(label);
  if(!summary){if(summaries.size>=maxLabels){droppedLabels++;return;}summary={label,count:0,failed:0,totalElapsedMs:0,maxElapsedMs:0,lastStart:0,lastEnd:0,scope:typeof span.scope==='string'?span.scope.slice(0,240):''};summaries.set(label,summary);}
  summary.count++;summary.failed+=span.failed?1:0;summary.totalElapsedMs+=span.duration;summary.maxElapsedMs=Math.max(summary.maxElapsedMs,span.duration);summary.lastStart=span.start;summary.lastEnd=span.end;
 };
 witness.onAwaitStart=({label,start})=>{
  if(closed||!Number.isFinite(start))return null;
  label=labelOf(label);if(!label)return null;
  if(pending.size>=maxPending){droppedPending++;return null;}
  const token=Object.freeze({});pending.set(token,{label,start});return token;
 };
 witness.onAwaitEnd=token=>{if(!closed)pending.delete(token);};
 const snapshot=({at}={})=>({
  scope:'Bounded optional phase attribution. Nested/overlapping elapsed spans must not be summed as exclusive CPU/GPU time. Pending phases identify waits, not their underlying bottleneck.',
  closed,droppedPending,droppedLabels,
  pending:[...pending.values()].map(row=>({...row,...(Number.isFinite(at)?{elapsedMs:Math.max(0,at-row.start)}:{})})),
  completed:[...summaries.values()].map(row=>({...row}))
 });
 const close=()=>{if(!closed){closed=true;pending.clear();}return snapshot();};
 return {witness,snapshot,close};
}
