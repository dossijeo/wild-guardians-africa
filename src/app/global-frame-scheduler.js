// Presentation owns this scheduler. No timers, RAF loop or native execution.
// CPU measurements are wall durations of synchronous JS, never GPU timings.
export class GlobalFrameScheduler {
  constructor({now=()=>performance.now(),targetMs=1000/60,maxPending=128}={}) {
    this.now=now;this.targetMs=targetMs;this.maxPending=maxPending;
    this.jobs=new Map();this.sequence=0;this.samples=[];this.lastTimestamp=null;
    this.budget=0;this.cooldown=0;this.lastPolicy=-Infinity;
    this.policy={median:0,p95:0,p99:0,cpu95:0,jitter:0};
    this.stats={completed:0,cancelled:0,failed:0,units:0,workMs:0,coordinationMs:0,maxUnitMs:0,overruns:0};
  }
  submit(iterator,{key=Symbol(),valid=()=>true,priority=0,deadline=Infinity,estimateMs=.25,signal}={}) {
    if(this.jobs.has(key))this.cancel(key);
    if(this.jobs.size>=this.maxPending)return Promise.reject(new Error('Frame scheduler backpressure'));
    return new Promise((resolve,reject)=>{
      const job={iterator,key,valid,priority,deadline,cost:Math.max(.01,estimateMs),created:this.now(),order:this.sequence++,resolve,reject,signal};
      job.abort=()=>this.cancel(key);this.jobs.set(key,job);
      signal?.addEventListener('abort',job.abort,{once:true});
      if(signal?.aborted)this.cancel(key);
    });
  }
  remove(job){this.jobs.delete(job.key);job.signal?.removeEventListener('abort',job.abort);}
  cancel(key){
    const job=this.jobs.get(key);if(!job)return;
    this.remove(job);this.stats.cancelled++;
    try{job.iterator.return?.();job.resolve(null);}catch(error){job.reject(error);}
  }
  beginFrame(timestamp){this.frame={timestamp,start:this.now()};}
  // Called after ALL mandatory presentation work, including simulation/UI/audio.
  endFrame(){
    const frame=this.frame;if(!frame)return;this.frame=null;
    const began=this.now(),cpu=began-frame.start,interval=this.lastTimestamp===null?0:frame.timestamp-this.lastTimestamp;
    this.lastTimestamp=frame.timestamp;
    if(interval>0&&interval<2000){this.samples.push({time:frame.timestamp,interval,cpu});}
    while(this.samples.length&&this.samples[0].time<frame.timestamp-2000)this.samples.shift();
    if(interval>this.targetMs*1.5||cpu>this.targetMs*.85)this.cooldown=3;
    if(began-this.lastPolicy>=100){
      this.lastPolicy=began;
      const times=this.samples.map(s=>s.interval).sort((a,b)=>a-b),costs=this.samples.map(s=>s.cpu).sort((a,b)=>a-b);
      const q=(a,p)=>a.length?a[Math.min(a.length-1,Math.floor((a.length-1)*p))]:0;
      const median=q(times,.5),p95=q(times,.95),p99=q(times,.99),cpu95=q(costs,.95);
      const jitter=p95-median;this.policy={median,p95,p99,cpu95,jitter};
      // Slow presentation alone is pressure, not proof of CPU/GPU saturation.
      // Never expand the interval to count missed refreshes as available time.
      const period=Math.min(this.targetMs,median||this.targetMs);
      const desired=this.samples.length<3?0:Math.max(0,period-cpu95-Math.max(period*.12,jitter,p99-p95));
      this.budget=desired<this.budget?desired:this.budget+(desired-this.budget)*.2;
    }
    const period=Math.min(this.targetMs,this.policy.median||this.targetMs);
    const remaining=Math.max(0,frame.timestamp+period-began-period*.1);
    const base=Math.min(remaining,this.budget*(this.cooldown>0?.35:1));
    if(this.cooldown>0)this.cooldown--;
    let work=0;
    while(this.jobs.size){
      const time=this.now();let selected=null,best=-Infinity;
      for(const job of this.jobs.values()){
        let valid;try{valid=job.valid();}catch(error){this.remove(job);try{job.iterator.return?.();}catch{}job.reject(error);this.stats.failed++;continue;}
        if(!valid){this.cancel(job.key);continue;}
        const age=time-job.created,urgent=job.deadline<=time+period;
        // Deadlines may borrow measured headroom, never unmeasured idle time.
        const allowed=urgent?remaining:base;
        if(time-began+job.cost>allowed)continue;
        const score=job.priority+age/100+(urgent?1000:0)-job.order*.000001;
        if(score>best){selected=job;best=score;}
      }
      if(!selected)break;
      const start=this.now();
      try{
        const result=selected.iterator.next();
        if(result?.then)throw new TypeError('Scheduled units must be synchronous');
        if(result.done){this.remove(selected);this.stats.completed++;selected.resolve(result.value);}
        else selected.order=this.sequence++;
      }catch(error){this.remove(selected);try{selected.iterator.return?.();}catch{}selected.reject(error);this.stats.failed++;}
      const duration=this.now()-start;work+=duration;this.stats.units++;this.stats.maxUnitMs=Math.max(this.stats.maxUnitMs,duration);
      selected.cost=Math.max(duration,selected.cost*.8); // Conservative recent unit estimate.
      if(this.now()-began>=remaining){this.stats.overruns++;break;}
    }
    this.stats.workMs+=work;this.stats.coordinationMs+=Math.max(0,this.now()-began-work);
  }
  snapshot(){const now=this.now();let oldestMs=0;for(const job of this.jobs.values())oldestMs=Math.max(oldestMs,now-job.created);return {...this.stats,...this.policy,budgetMs:this.budget,pending:this.jobs.size,oldestMs};}
}
export const globalFrameScheduler=new GlobalFrameScheduler();
const enabled=new URLSearchParams(globalThis.location?.search??'').get('frameScheduler')==='1';
export const globalFrameSchedulerEnabled=()=>enabled;
