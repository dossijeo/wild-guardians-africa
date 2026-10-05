import {raidEntryKey,raidEntryRequest} from './raid-entry-data.js';

export class RaidEntryPreparer {
  constructor(nav,{createWorker=()=>new Worker(new URL('./raid-entry-worker.js',import.meta.url),{type:'module'})}={}){
    this.nav=nav;this.token=0;this.stats={requests:0,accepted:0,obsolete:0,used:0,failed:0};
    this.take=(state,group,bounds)=>{
      const key=raidEntryKey(state,nav,group,bounds);
      if(!this.ready||key!==this.ready.key)return;
      this.stats.used++;return this.ready;
    };
    nav.preparedRaidEntry=this.take;
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
    if(this.disposed||!this.worker)return;
    const plan=state.nightPlan;
    if(state.raid||state.result||state.postgame||!plan||plan.done){this.ready=null;return;}
    const key=raidEntryKey(state,this.nav,plan.group);
    if(!key||this.ready?.key===key||this.pending)return;
    const token=++this.token;
    this.pending={token,key};this.stats.requests++;
    try{this.worker.postMessage(raidEntryRequest(state,this.nav,plan.group,key,token));}
    catch{this.disable();}
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;this.worker?.terminate();this.worker=null;
    if(this.nav.preparedRaidEntry===this.take)delete this.nav.preparedRaidEntry;
    this.pending=null;this.ready=null;this.state=null;
  }
}
