import {nativeInitialIdleRequestFixture} from './native-initial-idle-request.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

export function nativeInitialIdleGameFixture(options={}){
 const f=nativeInitialIdleRequestFixture({...options,configureState(state,{point}){
  state.structures=state.structures.filter(s=>!s.gate);
  Object.assign(state,{pauses:[],result:null,initialPreparation:false,raid:null,spells:[],dayPlan:{done:true},nightPlan:{done:true}});if(state.awakenings)state.awakenings.enabled=false;state.tutorial.step='done';
  for(const plant of state.plants)plant.water=[];
  // Authored Home goal on the fixture's verified clear corridor. The source
  // fixture's imported village is outside that deliberately small world.
  const village=state.villages.find(v=>v.id===state.workers[0].villageId);village.entry=point(6,0);
  options.configureState?.(state,{point});
 }});
 try{
  f.planner.requestNativeInitialIdleResources(f.state,f.worker);
  if(options.bound!==false)f.planner.commitNativeCausalClock();
  const nav=createSpatialNavigationMovement(f.session,f.state);nav.intentTaskPlanner=f.planner;
  const fail=()=>{throw Error('Initial native Idle must not use legacy JS movement, policy navigation or clearance');};nav.path=fail;nav.workerMotionClear=fail;nav.workerRouteClear=fail;
  return {...f,nav};
 }catch(error){f.close();throw error;}
}
