import {serialize} from '../persistence/snapshots.js';
export class HiringRoutePreparer {
 constructor(nav,{createWorker=()=>new Worker(new URL('./hiring-route-worker.js',import.meta.url),{type:'module'})}={}){
  this.nav=nav;this.createWorker=createWorker;this.token=0;this.stats={requests:0,accepted:0,obsolete:0,used:0,failed:0};
 }
 key(state,selection,centerId,snapshot=serialize(state)){return JSON.stringify([this.nav.version,centerId,selection,this.nav.activeBounds,this.nav.raidView,snapshot]);}
 update(state,selection,centerId=null){
  if(this.disposed||this.disabled)return;
  if(!Object.values(selection).some(n=>n>0)){this.cancel();return;}
  this.state=state;this.selection={...selection};this.centerId=centerId;
  const snapshot=serialize(state),key=this.key(state,selection,centerId,snapshot);if(this.ready?.key===key||this.pending?.key===key){this.wanted=null;return;}if(this.wanted?.key===key)return;
  this.ready=null;
  this.wanted={key,snapshot,selection:{...selection},centerId,profile:this.nav.profile,bounds:this.nav.activeBounds,view:this.nav.raidView};this.send();
 }
 send(){
  if(this.pending||!this.wanted||this.disabled||this.disposed)return;
  try{
   if(!this.worker){const worker=this.worker=this.createWorker();worker.onmessage=({data})=>this.receive(data);worker.onerror=()=>{if(this.worker===worker)this.disable();};}
   const wanted=this.wanted;this.wanted=null;this.pending={token:++this.token,key:wanted.key};this.stats.requests++;
   const {key,...request}=wanted;this.worker.postMessage({...request,token:this.token});
  }catch{this.disable();}
 }
 receive(data){
  if(this.disposed||data.token!==this.pending?.token)return;
  const pending=this.pending;this.pending=null;
  if(data.error){this.stats.failed++;this.ready=null;}
  else if(pending.key===this.key(this.state,this.selection,this.centerId)){this.ready={...data,key:pending.key};this.stats.accepted++;}
  else this.stats.obsolete++;
  this.send();
 }
 take(state,selection,centerId=null){
  if(!this.ready||this.ready.key!==this.key(state,selection,centerId))return;
  const ready=this.ready;this.ready=null;this.stats.used++;return ready;
 }
 cancel(){this.token++;this.worker?.terminate();this.worker=null;this.pending=null;this.ready=null;this.wanted=null;this.state=null;this.selection=null;}
 disable(){this.stats.failed++;this.disabled=true;this.cancel();}
 dispose(){if(this.disposed)return;this.disposed=true;this.cancel();}
}
