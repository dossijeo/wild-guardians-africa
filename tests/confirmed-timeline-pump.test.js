import test from 'node:test';
import assert from 'node:assert/strict';
import {createConfirmedTimelinePump} from '../src/rendering/confirmed-timeline-pump.js';

function fixture(items){let sequence=0,lastElapsed=0,ready=true;const seen=[];return {seen,setReady(value){ready=value;},stream:{status:()=>({closed:false,sequence,lastElapsed}),timelineStatus:()=>({receivedElapsed:items.at(-1)?.elapsed??lastElapsed}),nextTimelineBoundary:()=>items[0]??null,advanceNextTimelineBoundary(){if(!ready)return false;const item=items.shift();sequence=item.sequence;lastElapsed=item.elapsed;seen.push(item);return true;}}};}
test('pump applies ordered confirmed boundaries without inferring a clock rate',()=>{
 const f=fixture([{sequence:1,elapsed:1,pauses:['menu']},{sequence:2,elapsed:1,pauses:[]},{sequence:3,elapsed:6,rate:5}]),pump=createConfirmedTimelinePump({stream:f.stream,maxBoundaries:2});assert.equal(pump.advance(),2);assert.deepEqual(f.seen.map(item=>item.elapsed),[1,1]);assert.equal(pump.advance(),1);assert.equal(f.seen.at(-1).elapsed,6);assert.equal(pump.advance(),0);pump.dispose();assert.throws(()=>pump.advance(),/disposed/);
});
test('pump waits for terrain and rejects discontinuous or future boundaries',()=>{
 const f=fixture([{sequence:1,elapsed:2}]),pump=createConfirmedTimelinePump({stream:f.stream});f.setReady(false);assert.equal(pump.advance(),0);assert.deepEqual(f.seen,[]);f.setReady(true);assert.equal(pump.advance(),1);const bad=fixture([{sequence:2,elapsed:1}]);assert.throws(()=>createConfirmedTimelinePump({stream:bad.stream}).advance(),/Invalid confirmed/);
});
