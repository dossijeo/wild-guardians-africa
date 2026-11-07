import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {captureHistoricalGates} from '../src/simulation/worker-historical-gates.js';

test('physical collider bounds must remain outside the complete swing of every unchanged gate',()=>{
 const game=JSON.parse(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz'))),gate=game.structures.find(item=>item.gate&&item.status!=='ruined'),captured=captureHistoricalGates(game),box=(x,z)=>({minX:x-.5,maxX:x+.5,minZ:z-.5,maxZ:z+.5}),samples=bound=>({complete:true,samples:[{at:0,bounds:[bound]},{at:1,bounds:[bound]}]});assert.ok(gate);assert.equal(captured.certifyPhysicalBounds(samples(box(gate.x,gate.z)),0,1),false);assert.equal(captured.certifyPhysicalBounds(samples(box(gate.x+1000,gate.z+1000)),0,1),true);gate.gateOpen=(gate.gateOpen??0)===0?.5:0;assert.equal(captured.certifyPhysicalBounds(samples(box(gate.x+1000,gate.z+1000)),0,1),false);
});
