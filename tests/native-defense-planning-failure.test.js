import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {createNativeFundedDefensePolicy} from '../tools/native-funded-defense-policy.mjs';
import {shoreDefenseContours} from '../tools/native-shore-defense-contour.mjs';
import {containsPoint} from '../src/world/footprints.js';
import {wallPlacementContour} from '../tools/native-wall-placement-contour.mjs';
test('unchanged native geometric failures are not retried; topology and crop occupancy invalidate',()=>{
 const source=new URL('../docs/qa/integrated-spiritual-survival/pilot-v5-good-canyon-712-cache/partial-state.json.gz',import.meta.url),bytes=readFileSync(source),s=deserialize(gunzipSync(bytes).toString());
 const {nav}=createOpeningWorld({seed:s.seed,biome:s.biome,culture:s.culture,terrainVersion:s.terrainVersion});nav.setState(s);
 const policy=createNativeFundedDefensePolicy({startDay:1,interval:1,obstacleAware:false}),before=serialize(s);
 let queries=0;const raw=nav.wallPlacement;nav.wallPlacement=function(...args){queries++;return raw.apply(this,args);};
 const args={command:()=>{throw Error('No unaffordable or invalid purchase');},reserve:180};
 assert.equal(policy.act(s,nav,args),0);assert(queries>0);assert.equal(policy.report().history.at(-1).reason,'no-bounded-legal-contour');
 const initial=queries;s.elapsed+=1;assert.equal(policy.act(s,nav,args),0);assert.equal(queries,initial);assert.equal(policy.report().history.at(-1).reason,'unchanged-geometric-planning-failure');
 s.elapsed+=1;nav.setState(s);policy.act(s,nav,args);assert(queries>initial);const changed=queries;
 s.elapsed+=1;s.plants.find(p=>p.alive).alive=false;policy.act(s,nav,args);assert(queries>changed);
 const restored=deserialize(before);assert.equal(restored.ledger.balance.n,s.ledger.balance.n);assert.deepEqual(readFileSync(source),bytes);
});
test('wall contour uses placement rather than walking rules, remains deterministic and obeys search limits',()=>{
 const s={plants:[{id:'p',alive:true,x:0,z:0}],structures:[]},nav={field:{fluidInside:()=>false},wallPlacement:()=>({valid:true}),walkable:()=>{throw Error('Actor walking is not wall placement');}};
 const candidate={bounds:[-4,-4,4,4],points:[[-4,-4],[4,-4],[4,4],[-4,4],[-4,-4]]};
 const a=wallPlacementContour(s,nav,candidate);assert(a.candidate);assert.deepEqual(a,wallPlacementContour(s,nav,candidate));
 assert(containsPoint(a.candidate.points.map(([x,z])=>({x,z})),0,0));assert(a.queries>0);
 assert.equal(wallPlacementContour(s,nav,candidate,{maxVisited:1}).reason,'placement-search-bound');
 assert.equal(wallPlacementContour(s,{...nav,wallPlacement:()=>({valid:false})},candidate).candidate,null);
});
test('shore envelope preserves land and enforces a bounded deterministic planning search',()=>{
 const s={plants:[{id:'p',alive:true,x:0,z:0}],structures:[]},nav={field:{fluidInside:()=>false}};
 const a=shoreDefenseContours(s,nav),b=shoreDefenseContours(s,nav);assert.deepEqual(a,b);assert.equal(a.candidates.length,1);
 const polygon=a.candidates[0].points.map(([x,z])=>({x,z}));assert(containsPoint(polygon,0,0));
 assert.equal(shoreDefenseContours(s,nav,{maxCells:1}).reason,'shore-cell-bound');
 assert.equal(shoreDefenseContours(s,{field:{fluidInside:()=>true}}).candidates.length,0);
 assert.throws(()=>shoreDefenseContours(s,nav,{step:0}),/bounded/);
});
