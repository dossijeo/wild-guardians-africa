import assert from 'node:assert/strict';
import {savedNativeIdleApproach} from './native-idle-approach-restoration.js';
import {savedNativeIdleStroll,nativeIdleStrollRestorationSource} from './native-idle-stroll-restoration-source.js';
import {restoredNativeIdleStrollGame} from './native-idle-stroll-restoration-game.js';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
import {tick} from '../../src/simulation/game.js';

// Source/Game integration on a fresh authority. These direct trusted native
// commits do not supply a renderer, GPU receipt or production control lease.
export async function nativeIdleFailedCycleGame({profile='youngMale',threaded=false,local=false,retry,rng,epoch=0}={}){
 let f,runtime;
 try{
  const saved=local?savedNativeIdleStroll({profile}):savedNativeIdleApproach({profile}),worker=saved.state.workers[0];
  saved.state.elapsed+=epoch;
  if(rng!==undefined)worker.idleState.rng=rng;
  if(retry!==undefined){
   if(retry==='rest-end'){let x=worker.idleState.rng;x^=x<<13;x^=x>>>17;x^=x<<5;retry=saved.reference.idleSeconds*(2+Math.floor((x>>>0)/4294967296*3));}
   worker.idleState.approachRetry=retry;
  }
  // Same ordinary scheduling isolation as nativeIdleStrollGameSave; retain
  // the real saved anchor, fractional body pose and native WALK semantics.
  saved.state.structures=saved.state.structures.filter(s=>!s.gate);Object.assign(saved.state,{pauses:[],result:null,initialPreparation:false,raid:null,spells:[],dayPlan:{done:true},nightPlan:{done:true}});if(saved.state.awakenings)saved.state.awakenings.enabled=false;saved.state.tutorial.step='done';for(const p of saved.state.plants)if(p.water[0])p.water[0].status='manual';
  if(threaded){const {default:factory}=await import('../../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=restoredNativeIdleStrollGame(saved,{core:runtime?.core});const q=f.planner.nativeIdleStrollRequestReference(f.actor);assert(q);
  if(local)assert(f.session.core.addWall(q.destination.x,q.destination.z,.4,.4)>0);
  return {...f,sourceRequest:q,
   prepareCycle(){const p=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(p.status,'proposed',JSON.stringify(p));return p.proposal;},
   commitCycle(proposal,{project=true}={}){assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),proposal.ticket.ticket),1);assert(['committed','unchanged'].includes(f.planner.commitNativeCausalClock().status));if(project)assert(f.planner.projectNativeIdleCycle(f.state,f.worker));return f.planner.nativeIdleCycleBinding(f.actor);},
   advanceCycle(){const view=f.planner.nativeIdleCycleExecution(f.actor);assert(view);tick(f.state,Math.max(0,view.endTime-f.state.elapsed)+1e-8,f.nav);return f.planner.nativeIdleCycleNextRequest(f.actor);},
   async dispose(){f.close();await runtime?.dispose();}
  };
 }catch(error){f?.close();await runtime?.dispose();throw error;}
}

// Clean physical source fixture for repair/unknown DTO tests. It uses the
// original saved pose, but is not the fresh Game world's Farm geometry.
export function nativeIdleFailedCycleBridge({retry=.25,unknown=false}={}){
 const saved=savedNativeIdleApproach(),idle=saved.state.workers[0].idleState;idle.approachRetry=retry;
 if(unknown){const plant=saved.state.plants.find(p=>p.id===`plant-${saved.reference.anchor.id}`);plant.x+=480;idle.destination.x=plant.x;saved.reference={...saved.reference,anchor:{...saved.reference.anchor,x:plant.x}};}
 const f=nativeIdleStrollRestorationSource(saved,{peer:true});try{
  const q=f.bridge.nativeIdleStrollRequestReference(f.actor),wall=f.session.core.addWall(unknown?q.pose.x:q.destination.x,unknown?q.pose.z:q.destination.z,.4,.4);assert(wall>0);f.admitPeer();assert.equal(f.bridge.beginNativeRouteExecution().status,'started');f.bridge.commitNativeCausalClock();
  return {...f,sourceRequest:q,wall,
   prepareCycle(){const p=f.bridge.prepareNativeIdleCycleProposal(f.actor);assert.equal(p.status,'proposed',JSON.stringify(p));return p.proposal;},
   commitCycle(proposal){assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),proposal.ticket.ticket),1);f.w.nav_intent_clock_commit(1,0);return f.bridge.nativeIdleCycleBinding(f.actor);},
   advanceBy(seconds){assert.equal(f.advance(f.state.elapsed+seconds).status,'advanced');assert(f.w.nav_intent_clock_commit(1,0)>=0);return f.bridge.nativeIdleCycleNextRequest(f.actor);}
  };
 }catch(error){f.close();throw error;}
}
