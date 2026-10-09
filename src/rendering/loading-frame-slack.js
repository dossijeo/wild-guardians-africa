// QA opt-in scheduler fed exclusively by the existing presentation RAF.
// CPU headroom is not GPU capacity. Missing/late/stalled observations retain
// the existing fallback budget; no timer or animation loop is created here.
export class LoadingFrameSlack {
 constructor({targetMs=1000/60,history=12}={}){
  if(!Number.isFinite(targetMs)||targetMs<=0||!Number.isInteger(history)||history<3)throw Error('Invalid loading frame slack');
  this.targetMs=targetMs;this.intervals=new Float64Array(history);this.costs=new Float64Array(history);this.sorted=new Float64Array(history);this.count=0;this.index=0;this.previous=null;this.frame=null;this.closed=false;
  this.stats={frames:0,invalidFrames:0,adaptiveDecisions:0,fallbackDecisions:0,yields:0,continued:0,lastTargetMs:0,lastReserveMs:0,workSteps:0,workCpuMs:0,fallbackReasons:{}};
 }
 observeFrame({timestamp,start,end}){
  if(this.closed)return;
  const interval=this.previous===null?null:timestamp-this.previous;
  if(![timestamp,start,end].every(Number.isFinite)||start<timestamp||end<start||interval!==null&&(!Number.isFinite(interval)||interval<=0)){this.frame=null;this.stats.invalidFrames++;return;}
  this.previous=timestamp;this.frame={timestamp,start,end,interval};this.stats.frames++;
  if(interval!==null){this.intervals[this.index]=interval;this.costs[this.index]=end-start;this.index=(this.index+1)%this.intervals.length;this.count=Math.min(this.count+1,this.intervals.length);}
 }
 createLane(){
  const costs=new Float64Array(8);let count=0,index=0;
  return {
   recordWork:duration=>{if(this.closed||!Number.isFinite(duration)||duration<0)return;this.stats.workSteps++;this.stats.workCpuMs+=duration;costs[index]=duration;index=(index+1)%costs.length;count=Math.min(count+1,costs.length);},
   shouldYield:(now,begin,fallback,mandatoryFallback=false)=>{
    const legacy=reason=>{this.stats.fallbackDecisions++;this.stats.fallbackReasons[reason]=(this.stats.fallbackReasons[reason]??0)+1;return mandatoryFallback||now-begin>=fallback;};
    const f=this.frame;
    if(fallback===0||this.closed||!f||this.count<3||!count||!Number.isFinite(now)||now<f.end)return legacy('missing-or-invalid');
    // Fixed small histories only; sorting is opt-in and never a world resource.
    this.sorted.fill(Infinity);for(let i=0;i<this.count;i++)this.sorted[i]=this.intervals[i];this.sorted.sort();
    const target=Math.min(this.targetMs,this.sorted[Math.floor(this.count/2)]);
    let presentation=0,jitter=0,next=0;
    for(let i=0;i<this.count;i++){presentation=Math.max(presentation,this.costs[i]);jitter=Math.max(jitter,Math.abs(this.intervals[i]-target));}
    for(let i=0;i<count;i++)next=Math.max(next,costs[i]);
    const reserve=presentation+jitter,lateness=f.start-f.timestamp;
    this.stats.lastTargetMs=target;this.stats.lastReserveMs=reserve;
    // Never manufacture headroom from an old RAF timestamp or a delayed task.
    if(f.interval===null||f.interval>target+presentation)return legacy('stalled-interval');
    if(lateness>reserve)return legacy('late-callback');
    if(now-f.end>=target)return legacy('stale-frame');
    if(reserve+next>=target)return legacy('uncertain-cost');
    this.stats.adaptiveDecisions++;
    const yieldNow=now+next>=f.timestamp+target-reserve;
    if(yieldNow)this.stats.yields++;else this.stats.continued++;
    return yieldNow;
   }
  };
 }
 dispose(){this.closed=true;this.frame=null;this.intervals.fill(0);this.costs.fill(0);this.sorted.fill(0);}
}
