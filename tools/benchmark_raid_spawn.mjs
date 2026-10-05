import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {spawnRaid} from '../src/simulation/raids.js';

const report=JSON.parse(readFileSync(process.argv[2])),context=report.timing.navigationContext,repeats=Number(process.argv[4]??8);
assert.ok(context?.state&&process.argv[3]);assert.ok(Number.isInteger(repeats)&&repeats>0);
const group=['warthog','hyena','buffalo','lion','rhino'],rows=[],states=new Set();
function candidateProps(x,z,radius){const result=[],reach=radius+8;for(let cz=Math.floor((z-radius+24)/48);cz<=Math.floor((z+radius+24)/48);cz++)for(let cx=Math.floor((x-radius+24)/48);cx<=Math.floor((x+radius+24)/48);cx++)for(const list of this.chunk(cx,cz).instances)for(const p of list){const dx=p.x-x,dz=p.z-z;if(Math.abs(dx)>=reach||Math.abs(dz)>=reach)continue;if(Math.hypot(dx,dz)<reach&&!this.suppressed.has(p.id))result.push(p);}return result;}
for(let iteration=0;iteration<repeats;iteration++)for(const mode of iteration%2?['optimized','terrain-only','props-only','reference']:['reference','props-only','terrain-only','optimized']){
 const state=deserialize(context.state),pack=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url))),nav=new Navigation(state.seed,state.biome,pack.profile);
 nav.setState(state);nav.setActiveBounds(context.activeBounds);nav.setRaidView(context.raidView.eye,context.raidView.target);
 for(const key of context.warmedChunks){const [cx,cz]=key.split(',').map(Number);nav.chunk(cx,cz);}
 if(mode==='props-only'||mode==='optimized')nav.propsAt=candidateProps;
 let terrainChecks=0;const raw=nav.terrainValid.bind(nav),check=(...args)=>{terrainChecks++;return raw(...args);};
 nav.terrainValid=check;
 if(mode==='terrain-only'||mode==='optimized'){const cache=new Map();nav.terrainValid=(x,z,radius=.3,worker=false)=>{const key=`${x},${z}:${radius}:${worker}`;if(cache.has(key))return cache.get(key);const result=check(x,z,radius,worker);if(cache.size>=16000)cache.clear();cache.set(key,result);return result;};}
 const started=performance.now();spawnRaid(state,{group},nav);const ms=performance.now()-started;
 assert.deepEqual(state.raid.animals.map(a=>a.species),group);
 const sha256=createHash('sha256').update(serialize(state)).digest('hex');states.add(sha256);rows.push({iteration,mode,ms,terrainChecks,sha256});
}
assert.equal(states.size,1,'Spawn decisions or complete state changed');
const median=values=>{const sorted=values.sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;},summary=Object.fromEntries(['reference','props-only','terrain-only','optimized'].map(mode=>[mode,{medianMs:median(rows.filter(r=>r.mode===mode).map(r=>r.ms))}]));
const sourceHashes=Object.fromEntries(['src/world/navigation.js','src/simulation/raids.js','tools/benchmark_raid_spawn.mjs'].map(path=>[path,createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex')]));
writeFileSync(process.argv[3],JSON.stringify({biome:report.biome,repeats,source:process.argv[2],sourceHashes,stateSha256:[...states][0],summary,rows,scope:'Alternating synchronous native spawn benchmark with identical pre-state, warmed prop chunks, radius rules and RNG. Reference uses unchanged production Navigation.propsAt. Timings exclude setup and rendering; not phone frametime.'},null,2)+'\n');console.log(JSON.stringify(summary));
