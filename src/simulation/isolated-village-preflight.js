import {deserialize,serialize} from '../persistence/snapshots.js';
import {foundVillage,observeGameEvents} from './game.js';
import {createSpatialGameSession} from '../world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement,SpatialChunkUnavailable} from '../world/wild-engine/spatial-navigation-movement.js';
import {operational} from './rules.js';

// Experimental only. A failed attempt may mutate its own session, so every
// retry reconstructs both state and native world from the untouched snapshot.
export function prepareVillageIsolated(module,snapshot,chunkKeys,command,{bounds=null,maxAdded=64}={}){
 if(!(module instanceof WebAssembly.Module)||typeof snapshot!=='string'||!Array.isArray(chunkKeys)||!command||!Number.isSafeInteger(maxAdded)||maxAdded<0)throw TypeError('Invalid isolated village preparation');
 const keys=new Set(chunkKeys),initialSize=keys.size,added=[];
 for(;;){
  const state=deserialize(snapshot),loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)}),events=[],stopEvents=observeGameEvents(state,event=>events.push(structuredClone(event)));
  try{
   for(const key of keys){if(typeof key!=='string'||!/^(-?\d+),(-?\d+)$/.test(key))throw TypeError('Invalid chunk key');const [cx,cz]=key.split(',').map(Number);if(!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz)||cx<-2147483648||cx>2147483647||cz<-2147483648||cz>2147483647||`${cx},${cz}`!==key)throw TypeError('Invalid chunk coordinates');if(session.core.selectChunk(cx,cz)<0&&session.core.addChunk(cx,cz)<0)throw Error('Could not add isolated chunk '+key);loaded.set(key,{...session.core.chunkPayload(),terrainRevision:0});}
   const nav=createSpatialNavigationMovement(session,state);if(bounds!==null)nav.setActiveBounds(bounds);
   const value=foundVillage(state,command.id,command.culture,command.x,command.z,command.payload,nav);
   return {value,snapshot:serialize(state),events,addedChunks:added,source:snapshot,command:structuredClone(command),preparedCenters:state.structures.filter(operational).map(c=>({id:c.id,villageId:c.villageId??null,culture:c.culture??null}))};
  }catch(error){
   if(!(error instanceof SpatialChunkUnavailable)||!Array.isArray(error.missing)||!error.missing.length)throw error;
   let progress=false;for(const {cx,cz} of error.missing){if(!Number.isInteger(cx)||!Number.isInteger(cz)||cx<-2147483648||cx>2147483647||cz<-2147483648||cz>2147483647)throw error;const key=`${cx},${cz}`;if(!keys.has(key)){keys.add(key);added.push(key);progress=true;}}
   if(!progress||keys.size-initialSize>maxAdded)throw error;
  }finally{stopEvents();session.dispose();}
 }
}

// Experimental: verifies the state boundary before using assignments from a
// successful isolated run. Native mutation itself is not yet transactional.
export function applyVillageIsolatedPlan(state,nav,plan){
 if(!plan||typeof plan.source!=='string'||typeof plan.snapshot!=='string'||!plan.command||!Array.isArray(plan.preparedCenters)||serialize(state)!==plan.source)throw Error('Stale village preparation');
 const c=plan.command;
 return foundVillage(state,c.id,c.culture,c.x,c.z,c.payload,nav,{preparedCenters:plan.preparedCenters});
}
