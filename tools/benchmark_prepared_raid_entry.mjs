import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {raidEntryKey,raidEntryRequest} from '../src/world/raid-entry-data.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';

const [input,output,count='8']=process.argv.slice(2),repeats=Number(count);
assert.ok(input&&output&&Number.isSafeInteger(repeats)&&repeats>0);
const source=JSON.parse(readFileSync(input)),context=source.timing.navigationContext,group=['warthog','hyena','buffalo','lion','rhino'];
const hash=value=>createHash('sha256').update(value).digest('hex'),rows=[],hashes=new Set();
for(let iteration=0;iteration<repeats;iteration++)for(const mode of iteration%2?['prepared','reference']:['reference','prepared']){
 const state=deserialize(context.state),profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);nav.setActiveBounds(context.activeBounds);nav.setRaidView(context.raidView.eye,context.raidView.target);
 for(const key of context.warmedChunks){const [cx,cz]=key.split(',').map(Number);nav.chunk(cx,cz);}
 let preparationMs=null;
 if(mode==='prepared'){
  const key=raidEntryKey(state,nav,group),started=performance.now(),reply=computeRaidEntry(raidEntryRequest(state,nav,group,key,1));
  preparationMs=performance.now()-started;nav.preparedRaidEntry=(s,g,b)=>raidEntryKey(s,nav,g,b)===reply.key?reply:undefined;
 }
 const started=performance.now();spawnRaid(state,{group},nav);const spawnMs=performance.now()-started,sha256=hash(serialize(state));hashes.add(sha256);
 rows.push({iteration,mode,spawnMs,preparationMs,sha256});
}
assert.equal(hashes.size,1,'Complete post-spawn state changed');
if(source.timing.preparation?.postState)assert.equal(hash(source.timing.preparation.postState),[...hashes][0],'Native browser post-state differs from the reference');
const median=values=>{const sorted=values.sort((a,b)=>a-b),i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;};
const summary=Object.fromEntries(['reference','prepared'].map(mode=>[mode,{medianSpawnMs:median(rows.filter(r=>r.mode===mode).map(r=>r.spawnMs))}]));
const sourceHashes=Object.fromEntries(['src/world/raid-entry-data.js','src/world/compute-raid-entry.js','src/world/raid-entry-preparer.js','src/world/navigation.js','src/world/raid-navigation-warmth.js','src/simulation/raids.js','tools/benchmark_prepared_raid_entry.mjs'].map(path=>[path,hash(readFileSync(new URL('../'+path,import.meta.url)))]));
writeFileSync(output,JSON.stringify({input,repeats,sourceHashes,stateSha256:[...hashes][0],summary,rows,scope:'Alternating identical native spawn replays. Preparation is measured separately and excluded from spawn CPU. Browser worker/frame timing and physical phone acceptance are separate.'},null,2)+'\n');console.log(JSON.stringify(summary));
