import test from 'node:test';import assert from 'node:assert/strict';
import {physicsWindowMetrics} from './browser/physics-window-metrics.js';
test('physical cycle cadence excludes its pre-window interval but keeps every measured CPU spike',()=>{
 const rows=[{dt:3800,renderMs:900},{dt:100,renderMs:50},{dt:300,renderMs:70}];
 const result=physicsWindowMetrics(rows,['dt','renderMs']);
 assert.deepEqual(result.dt,{count:2,mean:200,p95:300,p99:300,max:300});
 assert.equal(result.renderMs.count,3);assert.equal(result.renderMs.max,900);assert.equal(result.renderMs.mean,340);
 assert.equal(rows[0].dt,3800);
});
test('an isolated frame has CPU evidence but no in-window cadence, and corrupt telemetry fails',()=>{
 assert.deepEqual(physicsWindowMetrics([{dt:500,renderMs:8}],['dt']).dt,{count:0,mean:null,p95:null,p99:null,max:null});
 assert.throws(()=>physicsWindowMetrics([{renderMs:NaN}],['renderMs']),/Invalid/);
});
