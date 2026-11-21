import assert from 'node:assert/strict';
import {nativeIdleCycleFixture} from './native-idle-cycle.js';
import {updateIdle} from '../../src/simulation/idle.js';

// Trusted raw ABI; no graphical permission or ordinary Game producer.
export function nativeIdleStrollSourceFixture(options={}){
 const f=nativeIdleCycleFixture({mode:'watch',remaining:.03,rng:0,...options});
 try{
  const oracle=structuredClone(f.worker),p=f.propose();assert.equal(p.status,1);f.commit(p);
  updateIdle(oracle,f.anchor,p.header[23],f.oracleNavigation,f.state.seed);f.advance(p.header[23]);
  const next=f.next();assert.equal(next.data[6],3);assert.equal(oracle.idleState.mode,'walk');
  const read=(name,n)=>Array.from(new Float64Array(f.w.memory.buffer,f.w[name](),n));
  return {...f,oracle,decision:next,
   stage(sequence=next.data[4],session=f.w.nav_intent_session()){
    const status=f.w.nav_idle_stroll_proposal_stage(f.actor,session,sequence);if(status!==1)return {status};
    const tuple=f.tuple(),count=f.w.nav_idle_stroll_proposal_points(...tuple.slice(0,2)),rows=f.w.nav_idle_stroll_proposal_rows(...tuple.slice(0,2));
    return {status,ticket:tuple[1],header:read('nav_idle_stroll_proposal_header_ptr',24),semantic:read('nav_idle_stroll_proposal_semantic_ptr',20),
     points:Array.from(new Float32Array(f.w.memory.buffer,f.w.nav_idle_stroll_proposal_points_ptr(),count*2)),rows:read('nav_idle_stroll_proposal_rows_ptr',rows*16)};
   },
   commitStroll(prepared){const t=f.tuple();assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...t.slice(0,5),prepared.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');},
   stroll(){return f.w.nav_idle_stroll_execution(f.actor)===1?read('nav_idle_stroll_execution_ptr',42):null;},
   strollBinding(){return f.w.nav_idle_stroll_binding_snapshot(f.actor)===1?read('nav_idle_stroll_binding_ptr',72):null;}
  };
 }catch(error){f.close();throw error;}
}
