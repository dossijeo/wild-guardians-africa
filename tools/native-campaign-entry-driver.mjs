import {performance} from 'node:perf_hooks';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {raidEntryKey} from '../src/world/raid-entry-data.js';
import {serialize} from '../src/persistence/snapshots.js';
import {createNodeRaidEntryWorker} from './node-raid-entry-transport.mjs';
export class NativeCampaignEntryDriver{
 constructor(nav,{createWorker=createNodeRaidEntryWorker,maxWaitMilliseconds=30000}={}){
  this.nav=nav;this.maxWaitMilliseconds=maxWaitMilliseconds;this.worker=null;this.waits=[];this.updates=0;this.contexts=[];
  this.preparer=new RaidEntryPreparer(nav,{createWorker:()=>this.worker=createWorker()});
 }
 check(){if(this.worker?.failure)throw Error(`Entry worker failed: ${this.worker.failure.message}`);if(this.preparer.cooperativeError)throw Error(`Cooperative preparation failed: ${this.preparer.cooperativeError}`);}
 async advancePresentation(s){this.check();this.preparer.update(s);this.updates++;const ready=this.preparer.ready;if(ready&&ready.key!==this.lastContextKey){this.lastContextKey=ready.key;this.contexts.push({key:ready.key,token:ready.token,day:s.day,time:s.time,elapsed:s.elapsed,group:[...(s.nightPlan?.group??[])],entryActors:ready.entry?.entries.length??0,diagnostics:ready.diagnostics??null});}await new Promise(resolve=>setImmediate(resolve));this.check();}
 async waitForEntry(s){
  const began=performance.now(),frozen=serialize(s);let updates=0;
  while(true){
   await this.advancePresentation(s);updates++;
   
   const ready=this.preparer.ready,key=raidEntryKey(s,this.nav,s.nightPlan?.group);
   if(ready&&ready.key===key){
    if(serialize(s)!==frozen)throw Error('Pending entry wait changed simulated state');
    const row={day:s.day,time:s.time,elapsed:s.elapsed,key,updates,waitMilliseconds:performance.now()-began,group:[...s.nightPlan.group],entryActors:ready.entry?.entries.length??0,diagnostics:ready.diagnostics??null};this.waits.push(row);
    if(!ready.entry)throw Error('Completed preparation has no valid whole-group entry; case incomplete');
    return ready;
   }
   if(performance.now()-began>this.maxWaitMilliseconds){if(serialize(s)!==frozen)throw Error('Pending entry wait changed simulated state');this.waits.push({day:s.day,time:s.time,elapsed:s.elapsed,updates,waitMilliseconds:performance.now()-began,status:'observation-deadline',key});throw Error('Entry preparation observation deadline; no restart or fabricated simulated result');}
  }
 }
 report(){return {mode:'real-node-worker-with-production-cooperative-fallback',updates:this.updates,waits:structuredClone(this.waits),readyContexts:structuredClone(this.contexts),preparer:{...this.preparer.stats},workerFailure:this.worker?.failure?.message??null,scope:'Wall-clock waits are separate from simulated activity; no clock, RNG or geometry patches'};}
 async dispose(){this.preparer.dispose();if(this.worker)await this.worker.closed;}
}
