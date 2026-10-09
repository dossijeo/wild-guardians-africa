import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Navigation} from '../src/world/navigation.js';
import {findInitialLocation} from '../src/world/villages.js';
import {prepareInitialLocation} from '../src/world/prepare-initial-location.js';
const catalogue=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url)));
test('worker adoption preserves the exact procedural site and settlement configuration across six biomes',async()=>{
 for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert']){const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+biome+'.json',import.meta.url))).profile,payload=catalogue.find(v=>v.id==='mapungubwe'),native=new Navigation(712,biome,profile),site=findInitialLocation(native,payload),target=new Navigation(712,biome,profile);let worker;
 const pending=prepareInitialLocation(target,payload,{workerAvailable:true,createWorker:()=>worker={postMessage(){},terminate(){}}});worker.onmessage({data:structuredClone({site,config:native.config})});assert.deepEqual(await pending,site);assert.deepEqual(target.config,native.config);for(const point of [site,site.center,site.entry])assert.equal(target.field.surface(point.x,point.z),native.field.surface(point.x,point.z));}
});
test('cancelled or failed site worker cannot replace navigation data and is terminated once',async()=>{const target=new Navigation(712,'savanna',{}),original=target.config;let worker,closed=0;const createWorker=()=>worker={postMessage(){},terminate(){closed++;}},controller=new AbortController(),pending=prepareInitialLocation(target,{}, {workerAvailable:true,createWorker,signal:controller.signal});controller.abort();await assert.rejects(pending,/cancelled/);worker.onmessage({data:{site:{},config:{seed:2}}});assert.equal(target.config,original);assert.equal(closed,1);const failed=prepareInitialLocation(target,{}, {workerAvailable:true,createWorker});worker.onmessage({data:{error:'no valid site'}});await assert.rejects(failed,/no valid site/);assert.equal(closed,2);assert.equal(target.config,original);});
