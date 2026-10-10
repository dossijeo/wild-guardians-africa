import {isSharedRaidReply} from './raid-shared-worker.js';
import {Navigation} from './navigation.js';
import {TerrainField} from './terrain.js';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {raidExteriorInputKey,createRaidExteriorQuery,adoptRaidExteriorPayload} from './raid-exterior.js';
import {completeRaidEntryResult,isComputedRaidEntryResult,nativeOwnedRaidReply,raidRequestProof} from './raid-entry-result.js';
import {drainGeometrySteps} from './geometry-steps.js';
export const CANONICAL_RAID_RADII=Object.freeze([...new Set(Object.values(ANIMAL_ACTIONS.animals).map(a=>a.presentation.footprint.radius))]);
let ownerSequence=0;
const immutable=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))immutable(child);Object.freeze(value);}return value;};
const proof=request=>JSON.stringify([raidRequestProof(request),request.kind,request.radii]);
export function raidExteriorGeometryRequest(state,nav,owner,token){
 const {seed,biome,culture,terrainVersion,rng,villages,structures,suppressed,spells,navigationVersion}=state,key=raidExteriorInputKey(state,nav);
 return immutable(structuredClone({kind:'raid-exterior-geometry',owner,token,key,geometryKey:key,radii:CANONICAL_RAID_RADII,profile:nav.profile,config:nav.config,
  state:{seed,biome,culture,terrainVersion,rng,villages,structures,suppressed,spells,navigationVersion}}));
}
export function* computeRaidExteriorGeometrySteps(request){
 yield {phase:'geometry-navigation'};
 const state=structuredClone(request.state),nav=new Navigation(state.seed,state.biome,request.profile);
 if(request.config&&JSON.stringify(nav.config)!==JSON.stringify(request.config)){nav.config=structuredClone(request.config);nav.field=new TerrainField(nav.config);}
 nav.setState(state);
 yield {phase:'geometry-input-proof'};
 if(request.kind!=='raid-exterior-geometry'||request.key!==raidExteriorInputKey(state,nav)||JSON.stringify(request.radii)!==JSON.stringify(CANONICAL_RAID_RADII))throw Error('Invalid exterior geometry request');
 const query=createRaidExteriorQuery(state,nav),regions=[];
 for(const radius of request.radii)regions.push([radius,yield* query.regionsForSteps(radius)]);
 yield {phase:'geometry-complete-freeze'};
 return completeRaidEntryResult({kind:request.kind,owner:request.owner,token:request.token,key:request.key,proof:proof(request),geometry:{protocol:1,inputKey:request.key,regions}});
}
export const computeRaidExteriorGeometry=request=>drainGeometrySteps(computeRaidExteriorGeometrySteps(request));
// Experimental geometry-only prewarming: caller owns scheduling. No game
// clock, raid plan, RNG, live navigator patches or renderer loops are changed.
export class RaidExteriorPrewarmer {
 constructor(nav,{createWorker=()=>new Worker(new URL('./raid-entry-worker.js',import.meta.url),{type:'module'}),now=()=>performance.now(),transport=null}={}){
  this.nav=nav;this.transport=transport;this.createWorker=createWorker;this.now=now;this.owner=`exterior-prewarmer-${++ownerSequence}`;this.token=0;this.stats={jobs:0,aborted:0,adopted:0,rejected:0,workerFailures:0,steps:0,maxStepMs:0,maxSliceMs:0,maxUpdateMs:0,maxProofMs:0,maxAdoptionMs:0,phases:{}};this.status='idle';
  this.openWorker();
 }
 openWorker(){
  try{if(this.transport){this.worker=this.transport.worker;if(!this.worker)throw Error('Shared raid Worker unavailable');this.channel??=this.transport.channel('geometry',this.owner,event=>this.receive(event.data,event),error=>this.workerFailed(error));return;}this.worker=this.createWorker();if(!this.worker)throw Error('Worker unavailable');this.worker.onmessage=event=>this.receive(event.data,event);this.worker.onerror=error=>this.workerFailed(error);}
  catch(error){this.worker=null;this.stats.workerFailures++;this.lastError=String(error);}
 }
 cancel(){
  if(!this.pending)return;this.stats.aborted++;this.pending.iterator?.return();
  if(this.pending.worker){if(this.channel)this.channel.cancel();else {this.worker?.terminate();this.worker=null;}}
  this.pending=null;this.status='cancelled';
 }
 update(state){const started=this.now();try{return this.updateInputs(state);}finally{this.stats.maxUpdateMs=Math.max(this.stats.maxUpdateMs,this.now()-started);}}
 updateInputs(state){
  if(this.disposed)return;this.state=state;
  if(state.result||state.postgame){this.cancel();return;}
  const key=raidExteriorInputKey(state,this.nav);
  if(this.readyKey===key&&this.readyField===this.nav.field)return;
  if(this.failedKey===key)return;
  if(this.pending?.key===key&&this.pending.field===this.nav.field)return;
  if(this.pending){const hadWorker=!!this.pending.worker;this.cancel();if(hadWorker)this.openWorker();}
  const request=raidExteriorGeometryRequest(state,this.nav,this.owner,++this.token);
  this.pending={key,field:this.nav.field,token:request.token,proof:proof(request),request,worker:this.worker};this.stats.jobs++;this.status='working';
  if(this.worker){try{if(this.channel)this.channel.post(request);else this.worker.postMessage(request);}catch(error){this.workerFailed(error);}}
  else this.pending.iterator=computeRaidExteriorGeometrySteps(request);
 }
 workerFailed(error){
  this.lastError=String(error?.message??error);this.stats.workerFailures++;if(this.channel){this.channel.close();this.channel=null;}else this.worker?.terminate();this.worker=null;
  if(this.pending){const request=this.pending.request;this.pending.iterator?.return();this.pending={...this.pending,token:++this.token,worker:null,request:immutable({...request,token:this.token})};this.pending.proof=proof(this.pending.request);this.pending.iterator=computeRaidExteriorGeometrySteps(this.pending.request);this.status='working';}
 }
 receive(data,event){const started=this.now();try{return this.receiveOwned(data,event);}finally{this.stats.maxAdoptionMs=Math.max(this.stats.maxAdoptionMs,this.now()-started);}}
 receiveOwned(data,event){
  const pending=this.pending;if(this.disposed||!pending||data?.token!==pending.token)return;
  if(this.state?.result||this.state?.postgame||pending.field!==this.nav.field||pending.key!==raidExteriorInputKey(this.state,this.nav)){this.cancel();return;}
  if(data.error){this.workerFailed(new Error(data.error));return;}
  const origin=isComputedRaidEntryResult(data)||(pending.worker===this.worker&&nativeOwnedRaidReply(event,pending.worker))||isSharedRaidReply(data,pending.worker,this.owner,'geometry');
  if(!origin||data.kind!=='raid-exterior-geometry'||data.owner!==this.owner||data.key!==pending.key||data.proof!==pending.proof||typeof data.proof!=='string'||data.proof.length>16000000||!adoptRaidExteriorPayload(this.state,this.nav,data.geometry,CANONICAL_RAID_RADII)){
   this.stats.rejected++;this.failedKey=pending.key;pending.iterator?.return();this.pending=null;this.status='failed';this.lastError='Unowned, stale or malformed exterior geometry result';return;
  }
  this.readyKey=pending.key;this.readyField=pending.field;this.pending=null;this.stats.adopted++;this.status='prepared';
 }
 pump({maxSteps=128,maxMillis=2}={}){
  if(this.disposed||!this.pending?.iterator)return this.status;
  if(!Number.isSafeInteger(maxSteps)||maxSteps<0||!Number.isFinite(maxMillis)||maxMillis<0)throw RangeError('Invalid cooperative preparation budget');
  const started=this.now();
  if(this.pending.field!==this.nav.field||this.pending.key!==raidExteriorInputKey(this.state,this.nav)){this.cancel();return this.status;}
  this.stats.maxProofMs=Math.max(this.stats.maxProofMs,this.now()-started);let count=0;
  try{while(this.pending?.iterator&&count<maxSteps&&this.now()-started<maxMillis){
   const pending=this.pending,before=this.now(),phase=pending.phase??'geometry-first-yield',next=pending.iterator.next(),ms=this.now()-before;
   const metric=this.stats.phases[phase]??={steps:0,totalMs:0,maxMs:0};metric.steps++;metric.totalMs+=ms;metric.maxMs=Math.max(metric.maxMs,ms);this.stats.steps++;this.stats.maxStepMs=Math.max(this.stats.maxStepMs,ms);count++;
   if(next.done){this.receive(next.value);break;}pending.phase=next.value?.phase??'geometry-unknown';
  }}catch(error){this.lastError=String(error?.stack??error);this.failedKey=this.pending?.key;this.pending?.iterator.return();this.pending=null;this.status='failed';}
  this.stats.maxSliceMs=Math.max(this.stats.maxSliceMs,this.now()-started);return this.status;
 }
 dispose(){if(this.disposed)return;this.cancel();if(this.channel)this.channel.close();else this.worker?.terminate();this.channel=null;this.worker=null;this.state=null;this.disposed=true;this.status='disposed';}
}
