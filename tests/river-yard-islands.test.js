import assert from 'node:assert/strict';
import test from 'node:test';
import {riverYardsEnabled,createRiverYardSites,riverYardIslands} from '../src/rendering/river-yard-islands.js';
import {riverYardIslands as qa} from '../tools/experiments/qa-river-yard-islands.js';

test('river yard mask matches retained QA while preserving RGB and source bytes',()=>{
 const field={seed:712,c:{biome:'grand_river'}},settlements=[{x:20,z:10,hx:15,hz:18},{x:61,z:18,hx:12,hz:16}];
 const source={revision:()=>1,snapshot:()=>({settlements})},sites=createRiverYardSites(field,source)();
 const previous=globalThis.qaCampaignWorld;globalThis.qaCampaignWorld={spatialSession:{horizonSource:source}};
 try{for(const minX of [-24,24,72]){
  const data=Uint8Array.from({length:35*35*4},(_,i)=>(i*37+89)%256),original=data.slice(),bounds={minX,minZ:-24};
  const actual=riverYardIslands(data,bounds,field,sites),expected=qa(data,bounds,field);
  assert.deepEqual(actual,expected);assert.deepEqual(data,original);
  for(let i=0;i<data.length;i++)if(i%4!==3)assert.equal(actual[i],data[i]);else assert.ok(actual[i]<=data[i]);
 }}finally{if(previous===undefined)delete globalThis.qaCampaignWorld;else globalThis.qaCampaignWorld=previous;delete globalThis.qaRiverYardAudit;}
});
test('settlement snapshot is reused until revision changes and fallback remains independent',()=>{
 let revision=1,reads=0,settlements=[{x:1,z:2,hx:3,hz:4}];const field={c:{settlementSite:{x:99,z:98}}};
 const get=createRiverYardSites(field,{revision:()=>revision,snapshot:()=>{reads++;return {settlements};}});
 const first=get();for(let i=0;i<25;i++)assert.strictEqual(get(),first);assert.equal(reads,1);assert.equal(first[0].clearRadius,19);
 settlements=[{x:3,z:4,hx:30,hz:40}];revision++;assert.equal(get()[0].clearRadius,50);assert.equal(reads,2);assert.equal(first[0].x,1);
 assert.deepEqual(createRiverYardSites(field,null)(),[field.c.settlementSite]);
 assert.deepEqual(createRiverYardSites(field,{snapshot:()=>({settlements:[]})})(),[]);
 assert.equal(riverYardsEnabled('?visualLab=global-lighting&riverYards=islands'),true);assert.equal(riverYardsEnabled('?riverYards=islands'),false);assert.equal(riverYardsEnabled(''),false);
 const bytes=new Uint8Array(35*35*4);assert.strictEqual(riverYardIslands(bytes,{},field,[]),bytes);
});
