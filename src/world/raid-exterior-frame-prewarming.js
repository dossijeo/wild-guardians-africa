import {RaidExteriorPrewarmer} from './raid-exterior-prewarming.js';
import {hasRaidExteriorGeometry} from './raid-exterior.js';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';

// Explicit experimental load option, OFF unless boolean true. The caller is
// the existing render loop. No worker/RAF, simulation pause or raid deferral.
export function createRaidExteriorFramePrewarming(nav,{enabled=false,maxSteps=128,maxMillis=2,now=()=>performance.now(),transport=null}={}){
 if(enabled!==true)return;
 return new RaidExteriorFramePrewarming(nav,{maxSteps,maxMillis,now,transport});
}
export class RaidExteriorFramePrewarming {
 constructor(nav,{maxSteps=128,maxMillis=2,now=()=>performance.now(),transport=null}={}){
  this.nav=nav;this.maxSteps=maxSteps;this.maxMillis=maxMillis;this.now=now;
  // Share the existing entry Worker when explicitly connected. Unavailable
  // transport retains the actual cooperative continuation; no second loop.
  this.geometry=new RaidExteriorPrewarmer(nav,{createWorker:()=>null,now,transport});
  this.stats={frames:0,deadlineCalls:0,preparedEntries:0,warmGeometryFallbacks:0,coldGeometryFallbacks:0,maxFrameWorkMs:0,errors:0};
  this.deadlines=[];this.delegate=nav.preparedRaidEntry;
  this.take=(state,group,bounds)=>{
   const prepared=this.delegate?.(state,group,bounds);
   const radii=group.map(id=>ANIMAL_ACTIONS.animals[id]?.presentation.footprint.radius);
   const geometryReady=hasRaidExteriorGeometry(state,nav,radii);
   this.stats.deadlineCalls++;if(prepared)this.stats.preparedEntries++;else if(geometryReady)this.stats.warmGeometryFallbacks++;else this.stats.coldGeometryFallbacks++;
   if(this.deadlines.length<32)this.deadlines.push({day:state.day,time:state.time,elapsed:state.elapsed,preparedEntry:!!prepared,geometryReady,fallback:prepared?'prepared-entry':geometryReady?'native-sync-entry-warm-geometry':'native-sync-entry-cold-geometry'});
   // A cold miss is disclosed, not suppressed. Existing spawn consumes its
   // original RNG and deadline and performs the original synchronous fallback.
   return prepared;
  };
  nav.preparedRaidEntry=this.take;
 }
 frame(state){
  if(this.disposed)return;const started=this.now();this.stats.frames++;
  try{this.geometry.update(state);this.geometry.pump({maxSteps:this.maxSteps,maxMillis:this.maxMillis});}
  catch(error){this.stats.errors++;this.lastError=String(error);this.geometry.cancel();}
  finally{this.stats.maxFrameWorkMs=Math.max(this.stats.maxFrameWorkMs,this.now()-started);}
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;this.geometry.dispose();
  if(this.nav.preparedRaidEntry===this.take){if(this.delegate)this.nav.preparedRaidEntry=this.delegate;else delete this.nav.preparedRaidEntry;}
  this.delegate=null;
 }
}
