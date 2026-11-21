import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture} from './native-farm-arrival-route.js';
import {nativeFarmMovingTaskFixture} from './native-farm-moving-task.js';
import {createPlant} from '../../src/simulation/crops.js';

// Actual pending13/moving23/held24 source for a cold ordinary authority.
// Trusted source ABI only creates the saved state; the new authority must
// rebind and acquire through its real producer/ports, with no saved handles.
export function nativeFarmAuthoritySave({mode='pending',approach=false,anchorOffset=5,...options}={}){
 const settings={peer:false,...options,configureState(state,c){const crop=createPlant('plant-900098','mijo',c.target.x+(approach?anchorOffset:0),c.target.z,state.workers[0].centerId);crop.water[0].status='manual';state.plants.push(crop);options.configureState?.(state,c);}};
 const f=mode==='pending'?nativeFarmArrivalRouteFixture(settings):nativeFarmMovingTaskFixture({...settings,stop:mode==='held'});
 try{assert.equal(f.worker.nativeRouteAdmission,{pending:'pending-farm-arrival-resources',moving:'native-farm-arrival',held:'native-farm-arrival-held'}[mode]);return {state:structuredClone(f.state),worker:structuredClone(f.worker),oldEpoch:f.planner.authorityEpoch};}finally{f.close();}
}
