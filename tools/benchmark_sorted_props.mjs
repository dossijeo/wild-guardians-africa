import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {candidateSortedProps} from './prop-sorted-candidate.mjs';

const input=process.argv[2],output=process.argv[3],repeats=Number(process.argv[4]??12);
assert.ok(input&&output&&Number.isInteger(repeats)&&repeats>0);
const context=JSON.parse(readFileSync(input)).timing.navigationContext;
assert.ok(context?.state);
const rows=[],states=new Set(),group=['warthog','hyena','buffalo','lion','rhino'];
for(let iteration=-2;iteration<repeats;iteration++)for(const mode of iteration%2?['sorted','reference']:['reference','sorted']){
 const state=deserialize(context.state),pack=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url))),nav=new Navigation(state.seed,state.biome,pack.profile);
 nav.setState(state);nav.setActiveBounds(context.activeBounds);nav.setRaidView(context.raidView.eye,context.raidView.target);
 for(const key of context.warmedChunks){const [cx,cz]=key.split(',').map(Number);nav.chunk(cx,cz);}
 if(mode==='sorted')nav.propsAt=candidateSortedProps;
 const started=performance.now();spawnRaid(state,{group},nav);const ms=performance.now()-started;
 assert.deepEqual(state.raid.animals.map(a=>a.species),group);
 const sha256=createHash('sha256').update(serialize(state)).digest('hex');states.add(sha256);
 if(iteration>=0)rows.push({iteration,mode,ms,sha256});
}
assert.equal(states.size,1,'Complete spawn state differs');
const median=values=>{const sorted=values.toSorted((a,b)=>a-b),mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;};
const summary=Object.fromEntries(['reference','sorted'].map(mode=>[mode,{medianMs:median(rows.filter(r=>r.mode===mode).map(r=>r.ms))}]));
summary.candidatePairWins=Array.from({length:repeats},(_,i)=>rows.find(r=>r.iteration===i&&r.mode==='sorted').ms<rows.find(r=>r.iteration===i&&r.mode==='reference').ms).filter(Boolean).length;
const sourceHashes=Object.fromEntries(['src/world/navigation.js','src/simulation/raids.js','tools/benchmark_sorted_props.mjs','tools/prop-sorted-candidate.mjs'].map(path=>[path,createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex')]));
const report={input,repeats,warmupPairs:2,sourceHashes,stateSha256:[...states][0],summary,rows,scope:'Same saved desert pre-state and complete spawn decisions. Fresh navigators with matching warmed chunks, index creation included in timing. CPU only; background campaign processes remain active. No renderer, mobile, memory or full campaign acceptance.'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(summary));
