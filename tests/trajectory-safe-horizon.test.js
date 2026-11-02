import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// A sequential native registry check does not certify simultaneous playback.
// This is a counterexample for a proposed horizon, not a production collision test.
test('ordered static-body sweeps cannot certify concurrent visual interpolation', {skip:!process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM&&'Select a spatial WASM'},()=>{
 const module=new WebAssembly.Module(readFileSync(process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM));
 const w=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}}}).exports;w._initialize?.();w.spatial_bodies_reset();
 assert.equal(w.spatial_body_upsert(1,0,0,.25,0,1),1);assert.equal(w.spatial_body_upsert(2,1,1,.25,0,1),1);
 assert.equal(w.spatial_body_segment_clear(1,0,0,1,0,-1),1);
 assert.equal(w.spatial_body_upsert(1,1,0,.25,0,1),1);
 assert.equal(w.spatial_body_segment_clear(2,1,1,0,0,-1),1);
 // At equal normalized simulation time 0.6, the two swept discs overlap.
 const t=.6,first={x:t,z:0},second={x:1-t,z:1-t};
 assert.ok(Math.hypot(first.x-second.x,first.z-second.z)<.5);
 // A diagnostic ordered playback holds the other body fixed in each phase.
 // Exact closest-point distances for the two segments are 1 and sqrt(1/2).
 const distanceToSegment=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/den));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);};
 const firstPhase=distanceToSegment({x:1,z:1},{x:0,z:0},{x:1,z:0});
 const secondPhase=distanceToSegment({x:1,z:0},{x:1,z:1},{x:0,z:0});
 assert.equal(firstPhase,1);assert.ok(Math.abs(secondPhase-Math.SQRT1_2)<1e-12);
 assert.ok(Math.min(firstPhase,secondPhase)>.5);
});
