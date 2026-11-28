import assert from 'node:assert/strict';
import {savedNativeIdleStroll} from './native-idle-stroll-restoration-source.js';
import {restoreNativeActionGame} from './native-task-action-restoration.js';
import {serialize,deserialize} from '../../src/persistence/snapshots.js';

// Real old executed22 -> semantic public save/load -> fresh authority. Native
// preparation commits in these source tests are not graphical GPU receipts.
export function nativeIdleStrollGameSave(options={}){
 const saved=savedNativeIdleStroll(options),state=saved.state;
 state.structures=state.structures.filter(s=>!s.gate);Object.assign(state,{pauses:[],result:null,initialPreparation:false,raid:null,spells:[],dayPlan:{done:true},nightPlan:{done:true}});if(state.awakenings)state.awakenings.enabled=false;state.tutorial.step='done';for(const p of state.plants)if(p.water[0])p.water[0].status='manual';
 return {...saved,state:deserialize(serialize(state))};
}
export function restoredNativeIdleStrollGame(saved=nativeIdleStrollGameSave(),options={}){
 const f=restoreNativeActionGame(saved.state,{...options,admitPeer:false});try{
  const old=saved.reference,decl=f.planner.nativeIdleStrollDeclarationReference(f.actor);if(f.worker.nativeRouteAdmission==='pending-stroll-resources'){assert(decl);assert.notEqual(decl.authorityEpoch,old.worldBoundary.authorityEpoch);}
  return {...f,saved,prepare(){const p=f.planner.prepareNativeIdleStrollProposal(f.actor);assert.equal(p.status,'proposed',JSON.stringify(p));return p.proposal;},commit(proposal){assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');f.planner.commitNativeCausalClock();const binding=f.planner.nativeIdleStrollBinding(f.actor);assert(f.planner.projectNativeIdleStroll(f.state,f.worker));return binding;}};
 }catch(error){f.close();throw error;}
}
