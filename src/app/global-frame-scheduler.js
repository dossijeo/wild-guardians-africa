// Presentation owns this scheduler. No timers, RAF loop or native execution.
// CPU measurements are wall durations of synchronous JS, never GPU timings.
export class GlobalFrameScheduler {
  constructor({now=()=>performance.now(),targetMs=1000/60,maxPending=128,diagnostics=false}={}) {
    this.diagnostics=diagnostics?{idlePendingFrames:0,noHeadroom:0,mandatoryPressure:0,lateCallback:0,policyLimited:0,elapsedGuard:0,cpuSum:0,latenessSum:0,maxLateness:0}:null;
    this.now=now;this.targetMs=targetMs;this.maxPending=maxPending;
    this.jobs=new Map();this.sequence=0;this.samples=[];this.lastTimestamp=null;
    this.budget=0;this.nextOversizeRecovery=0;this.cooldown=0;this.lastPolicy=-Infinity;
    this.policy={median:0,p95:0,p99:0,cpu95:0,jitter:0};
    this.stats={completed:0,cancelled:0,failed:0,units:0,workMs:0,coordinationMs:0,maxUnitMs:0,overruns:0,deadlineLoans:0,oversizeRecoveries:0,blockingRecoveries:0,continuationMs:0,continuationTurns:0};
  }
  submit(iterator,{key=Symbol(),valid=()=>true,priority=0,deadline=Infinity,estimateMs=.25,estimate=null,signal,label=null,allowBlockingRecovery=false}={}) {
    if(this.jobs.has(key))this.cancel(key);
    if(this.jobs.size>=this.maxPending)return Promise.reject(new Error('Frame scheduler backpressure'));
    return new Promise((resolve,reject)=>{
      const created=this.now();
      const job={iterator,key,label,allowBlockingRecovery,valid,priority,deadline,estimate,cost:Math.max(.01,estimateMs),created,lastServed:created,order:this.sequence++,resolve,reject,signal};
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
  waitFor(job,pending){
    if(!pending||typeof pending.then!=='function')throw new TypeError('Scheduled dependency must be a promise');
    job.waiting=true;
    Promise.resolve(pending).then(value=>{
      if(this.jobs.get(job.key)!==job)return;
      job.resumeValue=value;job.waiting=false;
    },error=>{
      if(this.jobs.get(job.key)!==job)return;
      this.remove(job);try{job.iterator.return?.();}catch{}this.stats.failed++;job.reject(error);
    });
  }
  beginFrame(timestamp){this.frame={timestamp,start:this.now()};}
  // Called after ALL mandatory presentation work, including simulation/UI/audio.
  async endFrame(){
    const frame=this.frame;if(!frame)return;this.frame=null;
    const began=this.now(),cpu=began-frame.start,interval=this.lastTimestamp===null?0:frame.timestamp-this.lastTimestamp;
    this.lastTimestamp=frame.timestamp;
    if(interval>0&&interval<2000){this.samples.push({time:frame.timestamp,interval,cpu});}
    while(this.samples.length&&this.samples[0].time<frame.timestamp-2000)this.samples.shift();
    if(interval>Math.max(this.targetMs*1.5,this.policy.p95*1.2)||cpu>this.targetMs*.85)this.cooldown=3;
    if(began-this.lastPolicy>=100){
      this.lastPolicy=began;
      const times=this.samples.map(s=>s.interval).sort((a,b)=>a-b),costs=this.samples.map(s=>s.cpu).sort((a,b)=>a-b);
      const q=(a,p)=>a.length?a[Math.min(a.length-1,Math.floor((a.length-1)*p))]:0;
      const median=q(times,.5),p95=q(times,.95),p99=q(times,.99),cpu95=q(costs,.95);
      const jitter=p95-median;this.policy={median,p95,p99,cpu95,jitter};
      // Slow presentation alone is pressure, not proof of CPU/GPU saturation.
      // Never expand the interval to count missed refreshes as available time.
      const period=Math.min(this.targetMs,median||this.targetMs);
      // Presentation jitter can be GPU/OS pacing. Reduce ambition, but do not
      // subtract an entire missed refresh from measured CPU capacity.
      const cpuVariation=cpu95-q(costs,.5);
      const pressure=Math.max(.25,Math.min(1,period/(p99||period)));
      const desired=this.samples.length<3?0:Math.max(0,period-cpu95-Math.max(period*.12,cpuVariation))*pressure;
      this.budget=desired<this.budget?desired:this.budget+(desired-this.budget)*.2;
    }
    const period=Math.min(this.targetMs,this.policy.median||this.targetMs);
    const remaining=Math.max(0,frame.timestamp+period-began-period*.1);
    const base=Math.min(remaining,this.budget*(this.cooldown>0?.35:1));
    if(this.cooldown>0)this.cooldown--;
    let work=0,continuation=0,drainTurns=0,completedSubmission=false,units=0;
    while(this.jobs.size||(completedSubmission&&drainTurns<32&&this.now()-began<remaining)){
      if(!this.jobs.size){
        // Promise-ready producers can refill this same presentation budget.
        // Never await driver readiness or a timer here. Bound empty microtasks
        // and charge all intervening wall time; none is considered free CPU.
        const before=this.now();await Promise.resolve();continuation+=this.now()-before;
        drainTurns++;this.stats.continuationTurns++;continue;
      }
      if(units++>=1024)break;
      const time=this.now();let selected=null,best=-Infinity,borrowed=false,oversized=false,blocking=false;
      for(const job of this.jobs.values()){
        let valid;try{valid=job.valid();}catch(error){this.remove(job);try{job.iterator.return?.();}catch{}job.reject(error);this.stats.failed++;continue;}
        if(!valid){this.cancel(job.key);continue;}
        if(job.waiting)continue;
        const age=time-job.lastServed,urgent=job.deadline<=time+period;
        // Deadlines may borrow measured headroom, never unmeasured idle time.
        const allowed=urgent?remaining:base;
        let cost;
        try{cost=job.estimate?.()??job.cost;if(!Number.isFinite(cost)||cost<0)throw new RangeError('Invalid scheduled unit cost');}
        catch(error){this.remove(job);try{job.iterator.return?.();}catch{}job.reject(error);this.stats.failed++;continue;}
        const fits=time-began+cost<=allowed;
        // Explicit deadline debt, NOT idle time: permit one measured small unit
        // to miss the next refresh rather than starve a required chunk forever.
        // Bound both total synchronous CPU and elapsed presentation latency.
        const loan=!fits&&time>=job.deadline&&work===0&&cost<=period*.5&&
          cpu<period*.85&&cpu+cost<=period*1.25&&time-frame.timestamp+cost<=period*2;
        // A conservative historical outlier must not poison a required unit
        // forever. After one observation window overdue, allow ONE bounded
        // oversized retry on a cheap CPU frame, globally rate-limited. This is
        // an explicit overrun, never headroom or a lowered cost estimate.
        const recovery=!fits&&!loan&&work===0&&time-job.deadline>=2000&&time>=this.nextOversizeRecovery&&
          cost>period*.5&&cpu<period*.85&&cpu+cost<=period*2&&time-frame.timestamp+cost<=period*3;
        // Required producers may explicitly accept one exceptional blocking unit.
        // A poisoned shared estimate cannot otherwise acquire a new observation.
        // This is deadline debt, not free headroom; never enable for optional work.
        const unblock=job.allowBlockingRecovery&&!fits&&!loan&&!recovery&&work===0&&
          time-job.deadline>=5000&&time>=this.nextOversizeRecovery&&
          cpu<period*.5&&time-frame.timestamp<period;
        if(!fits&&!loan&&!recovery&&!unblock)continue;
        const score=job.priority+age/100+(urgent?1000:0)-job.order*.000001;
        if(score>best){selected=job;best=score;borrowed=loan||recovery||unblock;oversized=recovery||unblock;blocking=unblock;}
      }
      if(!selected)break;
      const start=this.now();selected.lastServed=start;if(oversized){this.nextOversizeRecovery=start+(blocking?5000:2000);this.stats.oversizeRecoveries++;if(blocking)this.stats.blockingRecoveries++;}
      try{
        const value=selected.resumeValue;selected.resumeValue=undefined;const result=selected.iterator.next(value);
        if(result?.then)throw new TypeError('Scheduled units must be synchronous');
        if(result.done){this.remove(selected);this.stats.completed++;completedSubmission=true;drainTurns=0;selected.resolve(result.value);}
        else {selected.order=this.sequence++;if(result.value&&typeof result.value==='object'&&'waitFor' in result.value)this.waitFor(selected,result.value.waitFor);}
      }catch(error){this.remove(selected);try{selected.iterator.return?.();}catch{}selected.reject(error);this.stats.failed++;}
      const duration=this.now()-start;work+=duration;if(borrowed&&!oversized)this.stats.deadlineLoans++;this.stats.units++;this.stats.maxUnitMs=Math.max(this.stats.maxUnitMs,duration);
      selected.cost=Math.max(duration,selected.cost*.8); // Conservative recent unit estimate.
      if(borrowed||this.now()-began>=remaining){this.stats.overruns++;break;}
    }
    if(this.diagnostics&&work===0&&[...this.jobs.values()].some(job=>!job.waiting)){
      const d=this.diagnostics,lateness=frame.start-frame.timestamp;d.idlePendingFrames++;d.cpuSum+=cpu;d.latenessSum+=lateness;d.maxLateness=Math.max(d.maxLateness,lateness);
      if(remaining===0)d.noHeadroom++;
      if(cpu>=period*.85)d.mandatoryPressure++;
      if(lateness>=period*.5)d.lateCallback++;
      if(base<.25&&remaining>=.25)d.policyLimited++;
      if(this.now()-frame.timestamp+.25>period*2)d.elapsedGuard++;
    }
    this.stats.workMs+=work;this.stats.continuationMs+=continuation;this.stats.coordinationMs+=Math.max(0,this.now()-began-work-continuation);
  }
  snapshot(){const now=this.now();let oldestMs=0,waiting=0;for(const job of this.jobs.values()){oldestMs=Math.max(oldestMs,now-job.created);if(job.waiting)waiting++;}return {...this.stats,...this.policy,budgetMs:this.budget,pending:this.jobs.size,waiting,oldestMs,...(this.diagnostics?{admissionDiagnostics:{...this.diagnostics}}:{})};}
}
export const globalFrameScheduler=new GlobalFrameScheduler({diagnostics:new URLSearchParams(globalThis.location?.search??'').get('frameSchedulerDiagnostics')==='1'});
// Production uses the measured scheduler bundle; QA can still select the old path.
export const frameSchedulerRequested=search=>new URLSearchParams(search).get('frameScheduler')!=='0';
const enabled=frameSchedulerRequested(globalThis.location?.search??'');
export const globalFrameSchedulerEnabled=()=>enabled;
