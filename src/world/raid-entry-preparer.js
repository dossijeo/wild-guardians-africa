import {raidEntryKey,raidEntryRequest} from './raid-entry-data.js';
import {RaidEntryComputation} from './raid-entry-computation.js';

export class RaidEntryPreparer {
  constructor(nav,{createWorker=()=>new Worker(new URL('./raid-entry-worker.js',import.meta.url),{type:'module'}),createCooperative=request=>new RaidEntryComputation(request),sliceOptions={maxBoundaries:16,maxGeometryChecks:256}}={}){
    this.nav=nav;this.token=0;this.createCooperative=createCooperative;this.sliceOptions=sliceOptions;this.stats={requests:0,accepted:0,obsolete:0,used:0,failed:0,cooperativeRequests:0,cooperativeSlices:0,cooperativeCompleted:0,cooperativeAborts:0,cooperativeErrors:0};
    this.take=(state,group,bounds)=>{
      const key=raidEntryKey(state,nav,group,bounds);
      if(!this.ready||key!==this.ready.key)return;
      this.stats.used++;return this.ready;
    };
    nav.preparedRaidEntry=this.take;
    this.peek=(state,group,bounds)=>this.ready?.key===raidEntryKey(state,nav,group,bounds)?this.ready:undefined;
    nav.preparedRaidEntryRevision=this.peek;
    try{this.worker=createWorker();this.worker.onmessage=({data})=>this.receive(data);this.worker.onerror=()=>this.disable();}
    catch{this.disable();}
  }
  disable(){this.stats.failed++;this.worker?.terminate();this.worker=null;this.pending=null;this.ready=null;}
  receive(data){
    if(this.disposed||data.token!==this.pending?.token)return;
    this.pending=null;
    if(data.error){this.disable();return;}
    if(data.key!==raidEntryKey(this.state,this.nav,this.state?.nightPlan?.group)){this.stats.obsolete++;return;}
    this.ready=data;this.stats.accepted++;
  }
  update(state){
    this.state=state;
    if(this.disposed)return;
    const plan=state.nightPlan;
    if(state.raid||state.result||state.postgame||!plan||plan.done){this.ready=null;this.abortCooperative();return;}
    const key=raidEntryKey(state,this.nav,plan.group);
    if(!this.worker){this.updateCooperative(state,key,plan.group);return;}
    if(!key||this.ready?.key===key||this.pending)return;
    const token=++this.token;
    this.pending={token,key};this.stats.requests++;
    try{this.worker.postMessage(raidEntryRequest(state,this.nav,plan.group,key,token));}
    catch{this.disable();}
  }
  abortCooperative(){if(!this.cooperative)return;this.cooperative.computation.dispose();this.cooperative=null;this.stats.cooperativeAborts++;}
  updateCooperative(state,key,group){
    if(!key){this.abortCooperative();return;}
    if(this.ready?.key===key||this.cooperativeFailureKey===key)return;
    if(this.cooperative&&this.cooperative.key!==key)this.abortCooperative();
    try{
      if(!this.cooperative){const token=++this.token;this.cooperative={key,token,computation:this.createCooperative(raidEntryRequest(state,this.nav,group,key,token))};this.stats.requests++;this.stats.cooperativeRequests++;}
      const pending=this.cooperative;this.stats.cooperativeSlices++;const step=pending.computation.pump(this.sliceOptions);
      if(step.done){this.cooperativeMetrics=structuredClone(pending.computation.metrics);pending.computation.dispose();this.cooperative=null;this.ready=step.value;this.stats.accepted++;this.stats.cooperativeCompleted++;}
    }catch(error){this.cooperativeError=String(error);this.cooperativeFailureKey=key;this.abortCooperative();this.stats.cooperativeErrors++;}
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;this.worker?.terminate();this.worker=null;this.abortCooperative();
    if(this.nav.preparedRaidEntry===this.take)delete this.nav.preparedRaidEntry;
    if(this.nav.preparedRaidEntryRevision===this.peek)delete this.nav.preparedRaidEntryRevision;
    this.pending=null;this.ready=null;this.state=null;
  }
}
