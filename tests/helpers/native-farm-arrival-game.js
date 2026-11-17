import assert from 'node:assert/strict';
import {nativeInitialIdleRequestFixture} from './native-initial-idle-request.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

// Real native source and Game; the independently admitted peer is genuine Task14.
export function nativeFarmArrivalGameFixture({declare=true,...options}={}){
 const f=nativeInitialIdleRequestFixture({mode:null,declareRequest:false,...options,configureState(state,{point}){
  state.structures=state.structures.filter(s=>!s.gate);Object.assign(state,{pauses:[],result:null,initialPreparation:false,raid:null,spells:[],dayPlan:{done:true},nightPlan:{done:true}});if(state.awakenings)state.awakenings.enabled=false;state.tutorial.step='done';for(const p of state.plants)p.water=[];
  Object.assign(state.workers[0],{status:'arriving',destinationId:null,idleState:null});state.villages.find(v=>v.id===state.workers[0].villageId).entry=point(6,0);options.configureState?.(state,{point});
 }});
 try{
  const request=()=>f.planner.requestNativeFarmArrivalResources(f.state,f.worker),requested=declare?request():null;
  if(options.bound!==false)assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  const nav=createSpatialNavigationMovement(f.session,f.state);nav.intentTaskPlanner=f.planner;
  const fail=()=>{throw Error('Pending farm arrival must not use JS movement, route planning or clearance');};nav.path=fail;nav.workerPath=fail;nav.workerMotionClear=fail;nav.workerRouteClear=fail;
  return {...f,nav,requested,request};
 }catch(error){f.close();throw error;}
}
