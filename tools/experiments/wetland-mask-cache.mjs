import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {TerrainField} from '../../src/world/terrain.js';
import {evictOldest} from '../../src/world/fifo-eviction.js';
import {createOpeningWorld} from '../check_opening.mjs';
import * as Game from '../../src/simulation/game.js';
import {serialize} from '../../src/persistence/snapshots.js';
const child=process.argv.includes('--child'),cached=process.argv.includes('--cached');
if(child){
 const caches=new WeakMap(),original=TerrainField.prototype.naturalWetlandMask;
 let calls=0,computations=0,evictions=0,peakEntries=0;
 TerrainField.prototype.naturalWetlandMask=function(x,z){
  calls++;
  if(!cached){computations++;return original.call(this,x,z);}
  let entry=caches.get(this);
  if(!entry||entry.seed!==this.seed){entry={seed:this.seed,map:new Map()};caches.set(this,entry);}
  const key=`${x},${z}`,map=entry.map;
  if(map.has(key))return map.get(key);
  computations++;const result=original.call(this,x,z);
  if(map.size>=4096){evictOldest(map);evictions++;}map.set(key,result);peakEntries=Math.max(peakEntries,map.size);return result;
 };
 const start=performance.now(),{s,nav}=createOpeningWorld({biome:'manglares',slotId:'mask-experiment'}),center=s.structures[0];
 for(let z=-9;z<=9&&s.plants.length<8;z+=1.5)for(let x=5;x<=25&&s.plants.length<8;x+=1.5){
  try{Game.plant(s,'mask-seed-'+s.plants.length,'mijo',Math.round((center.x+x)/1.5)*1.5,Math.round((center.z+z)/1.5)*1.5,nav);}catch{}
 }
 assert.equal(s.plants.length,8);Game.openInitialHiring(s);Game.hire(s,'mask-hire',{olderFemale:1,olderMale:1});s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={done:true};
 const trace=createHash('sha256');let maxTickMs=0,searches=0;
 const find=nav.findPath;nav.findPath=function(...args){searches++;return find.apply(this,args);};
 for(let i=0;i<2000;i++){
  const before=performance.now();Game.tick(s,.05,nav);maxTickMs=Math.max(maxTickMs,performance.now()-before);trace.update(serialize(s));
 }
 assert.ok(s.plants.some(p=>p.water[0].status==='manual'));
 console.log(JSON.stringify({cached,totalMs:performance.now()-start,maxTickMs,calls,computations,evictions,peakEntries,searches,steps:2000,trajectorySha256:trace.digest('hex')}));
}else{
 const samples=[],run=cache=>JSON.parse(execFileSync(process.execPath,[fileURLToPath(import.meta.url),'--child',...(cache?['--cached']:[])],{encoding:'utf8',maxBuffer:2e6}));
 for(let i=-2;i<8;i++){
  const row={};for(const kind of i%2?['cached','original']:['original','cached'])row[kind]=run(kind==='cached');
  for(const key of ['trajectorySha256','searches','steps'])assert.equal(row.original[key],row.cached[key],key);
  assert.ok(row.cached.peakEntries<=4096);if(i>=0)samples.push(row);
  process.stderr.write(`Mask pair ${i+3}/10: identical trajectory\n`);
 }
 const median=(kind,key)=>{const a=samples.map(s=>s[kind][key]).sort((a,b)=>a-b);return(a[3]+a[4])/2;};
 console.log(JSON.stringify({scope:'Experimental exact wetland-mask cache, outside runtime. Native Mangrove/Mapungubwe first day, eight paid crops/two paid workers, 2000 steps each. CPU only; no GPU/mobile/RAM measurement. Seed-scoped 4096-entry cache, FIFO eviction. Two warmup pairs and eight alternating process pairs; complete serialized-state trajectory hash equality.',medians:Object.fromEntries(['original','cached'].map(k=>[k,Object.fromEntries(['totalMs','maxTickMs','calls','computations','evictions','peakEntries'].map(p=>[p,median(k,p)]))])),samples},null,2));
}
