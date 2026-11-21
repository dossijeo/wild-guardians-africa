import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {centerFootprint} from '../src/world/centers.js';
import {spatialStateObstacles} from '../src/world/wild-engine/spatial-state-obstacles.js';

test('confirmed obstacle projection matches navigation rules in real mangrove raid state',()=>{
 const state=deserialize(gunzipSync(readFileSync(new URL('./fixtures/manglares-123-d10-raid-state.json.gz',import.meta.url))).toString());
 const before=JSON.stringify(state),expected=[...state.structures.filter(item=>item.status!=='ruined').map(item=>item.kind==='center'?centerFootprint(item,state):{...item,radius:.7}),...state.villages.flatMap(village=>(village.buildings??[]).filter(item=>item.kind!=='Zona común').map(item=>({...item,radius:item.radius??2.8})))];assert.deepEqual(spatialStateObstacles(state),expected);assert.equal(JSON.stringify(state),before);assert.ok(expected.length>0);
});
