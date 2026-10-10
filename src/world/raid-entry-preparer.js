import {SharedRaidPreparationWorker,isSharedRaidReply} from './raid-shared-worker.js';
import {raidEntryKey,raidEntryRequest} from './raid-entry-data.js';
import {raidExteriorInputKey,adoptRaidExteriorPayload} from './raid-exterior.js';
import {isComputedRaidEntryResult,nativeOwnedRaidReply,raidRequestProof,finiteRaidWarmth} from './raid-entry-result.js';
import {warmRaidNavigation} from './raid-navigation-warmth.js';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
let nextOwner=0;

export class RaidEntryPreparer {
  constructor(nav,{createWorker=()=>new Worker(new URL('./raid-entry-worker.js',import.meta.url),{type:'module'}),shareExteriorWorker=false,transport=null}={}){
    this.nav=nav;this.owner=`raid-preparer-${++nextOwner}`;this.token=0;this.stats={requests:0,accepted:0,obsolete:0,used:0,failed:0,rejected:0,geometryAdopted:0};
    this.take=(state,group,bounds)=>{
      const key=raidEntryKey(state,nav,group,bounds);
      if(!this.ready||key!==this.ready.key||this.ready.geometry.inputKey!==raidExteriorInputKey(state,nav))return;
      this.stats.used++;return this.ready;
    };
    nav.preparedRaidEntry=this.take;
    try{if(shareExteriorWorker===true||transport){this.transport=transport??new SharedRaidPreparationWorker({createWorker});this.worker=this.transport.worker;if(!this.worker)throw Error('Shared raid Worker unavailable');this.channel=this.transport.channel('entry',this.owner,event=>this.receive(event.data,event),()=>this.disable());}else{this.worker=createWorker();this.worker.onmessage=event=>this.receive(event.data,event);this.worker.onerror=()=>this.disable();}}
    catch{this.disable();}
  }
  disable(){this.stats.failed++;if(this.transport){this.channel?.close();}else this.worker?.terminate();this.worker=null;this.pending=null;this.ready=null;}
  receive(data,event){
    if(this.disposed||data?.token!==this.pending?.token)return;
    const pending=this.pending;this.pending=null;
    if(!this.state||this.state.raid||this.state.result||this.state.postgame||!this.state.nightPlan||this.state.nightPlan.done){this.stats.obsolete++;return;}
    if(data.error){this.disable();return;}
    const currentKey=raidEntryKey(this.state,this.nav,this.state?.nightPlan?.group);
    const freshGeometry=pending.field===this.nav.field&&pending.geometryKey===raidExteriorInputKey(this.state,this.nav);
    // An obsolete camera entry is never used. Its complete physical graph can
    // still be adopted if its separate geometry inputs and job owner are exact.
    if(!freshGeometry){this.stats.obsolete++;return;}
    const origin=isComputedRaidEntryResult(data)||nativeOwnedRaidReply(event,pending.worker)||isSharedRaidReply(data,pending.worker,this.owner,'entry');
    if(!origin||pending.worker!==this.worker||data.owner!==this.owner||data.key!==pending.key||data.proof!==pending.proof||typeof data.proof!=='string'||data.proof.length>16000000||
      !finiteRaidWarmth(data.warmth,this.nav.version)){
      if(data.key!==currentKey)this.stats.obsolete++;else this.stats.rejected++;
      this.lastError='Unowned or malformed raid preparation reply';return;
    }
    const radii=pending.group.map(id=>ANIMAL_ACTIONS.animals[id]?.presentation.footprint.radius);
    if(!adoptRaidExteriorPayload(this.state,this.nav,data.geometry,radii)){this.stats.rejected++;this.lastError='Invalid raid geometry payload';return;}
    // Origin, request snapshot and current geometry have been verified before
    // successful-query warmth can affect the main navigator.
    warmRaidNavigation(this.nav,data.warmth);this.stats.geometryAdopted++;
    if(data.key!==currentKey){this.stats.obsolete++;return;}
    this.ready=data;this.stats.accepted++;
  }
  update(state){
    this.state=state;
    if(this.disposed||!this.worker)return;
    const plan=state.nightPlan;
    if(state.raid||state.result||state.postgame||!plan||plan.done){this.ready=null;this.pending=null;return;}
    const key=raidEntryKey(state,this.nav,plan.group);
    if(!key||this.ready?.key===key||this.pending)return;
    const token=++this.token;
    const request=raidEntryRequest(state,this.nav,plan.group,key,token,this.owner);
    this.pending={token,key,worker:this.worker,field:this.nav.field,group:[...plan.group],geometryKey:request.geometryKey,proof:raidRequestProof(request)};this.stats.requests++;
    try{if(this.channel)this.channel.post(request);else this.worker.postMessage(request);}
    catch{this.disable();}
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;if(this.transport){this.channel?.close();this.transport.dispose();}else this.worker?.terminate();this.worker=null;
    if(this.nav.preparedRaidEntry===this.take)delete this.nav.preparedRaidEntry;
    this.pending=null;this.ready=null;this.state=null;
  }
}
