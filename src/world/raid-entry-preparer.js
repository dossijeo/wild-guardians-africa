import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {raidEntryKey,raidEntryRequest,raidEntryContextKey,activeRaidEntryPlan} from './raid-entry-data.js';

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
  disable(){this.stats.failed++;this.worker?.terminate();this.worker=null;this.pending=null;this.ready=null;this.nav.pendingRaidEntry=null;delete this.nav.raidEntryDemand;}
  receive(data){
    if(this.disposed||data.token!==this.pending?.token)return;
    this.pending=null;
    if(data.error){this.disable();return;}
    const plan=activeRaidEntryPlan(this.state);
    if(data.key!==raidEntryKey(this.state,this.nav,plan?.group)){this.stats.obsolete++;return;}
    this.ready=data;this.nav.pendingRaidEntry=data.entry?{entry:data.entry,radii:plan.group.map(id=>ANIMAL_ACTIONS.animals[id].presentation.footprint.radius),contextKey:raidEntryContextKey(this.state,this.nav,plan.group)}:null;this.stats.accepted++;
  }
  update(state){
    this.state=state;
    if(this.disposed||!this.worker)return;
    const plan=activeRaidEntryPlan(state);
    if(state.result||state.postgame||!plan||plan.done){this.ready=null;this.nav.pendingRaidEntry=null;return;}
    const key=raidEntryKey(state,this.nav,plan.group),context=raidEntryContextKey(state,this.nav,plan.group);
    if(this.nav.pendingRaidEntry&&this.nav.pendingRaidEntry.contextKey!==context)this.nav.pendingRaidEntry=null;
    if(this.ready&&this.ready.key!==key)this.ready=null;
    if(!key||this.ready?.key===key||this.pending)return;
    const token=++this.token;
    this.pending={token,key};this.stats.requests++;
    try{this.worker.postMessage(raidEntryRequest(state,this.nav,plan.group,key,token));}
    catch{this.disable();}
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;this.worker?.terminate();this.worker=null;
    if(this.nav.preparedRaidEntry===this.take)delete this.nav.preparedRaidEntry;
    this.pending=null;this.ready=null;this.state=null;this.nav.pendingRaidEntry=null;delete this.nav.raidEntryDemand;
  }
}
