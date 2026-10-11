// Read-only diagnosis of the complete original wave's canyon-bank fallback.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {canyonRaidFormation} from '../src/simulation/canyon-raid-formation.js';
import {reachableApproach} from '../src/simulation/raids.js';
import {animalSpec} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
const [directory,output]=process.argv.slice(2);
assert(directory&&output&&!existsSync(output),'Failed campaign and fresh output required');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const raw=readFileSync(directory+'/partial-state.json.gz'),s=deserialize(gunzipSync(raw).toString()),before=serialize(s);
const partial=JSON.parse(readFileSync(directory+'/partial.json')),source=JSON.parse(readFileSync(directory+'/source.json'));
assert.equal(JSON.parse(readFileSync(directory+'/receipt.json')).status,'incomplete-harness-error');
for(const [path,hash] of Object.entries(source.sourceHashes))assert.equal(sha(readFileSync(path)),hash,'Frozen source differs: '+path);
const context=JSON.parse(partial.entryTransport.waits.at(-1).key),group=context[6],bounds=context[7],view=context[8];
assert.deepEqual(group,s.nightPlan.group);
const profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[s.biome]+'.json')).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);nav.setActiveBounds(bounds);nav.setRaidView(view.eye,view.target);
const counters={walkable:0,blockedBody:0,segmentClear:0,blockedSegment:0,approach:0,failedApproach:0},samples=[];
for(const [method,bad] of [['walkable','blockedBody'],['segmentClear','blockedSegment']]){
 const original=nav[method].bind(nav);nav[method]=(...args)=>{counters[method]++;const result=original(...args);if(!result)counters[bad]++;return result;};
}
const approach=(actor,target,navigation)=>{
 counters.approach++;const result=reachableApproach(actor,target,navigation);
 if(!result)counters.failedApproach++;
 if(samples.length<64)samples.push({point:{x:actor.x,z:actor.z},radius:actor.radius,targetId:target.id,kind:target.kind??'crop',reachable:!!result});
 return result;
};
const specs=group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
const started=performance.now(),entry=canyonRaidFormation(s,specs,bounds,nav,approach),milliseconds=performance.now()-started;
assert.equal(serialize(s),before);assert.equal(sha(readFileSync(directory+'/partial-state.json.gz')),sha(raw));
const result={status:'observed-read-only-canyon-fallback',directory,inputSha256:sha(raw),sourceHashes:source.sourceHashes,group,bounds,view,actors:entry?.entries.length??0,entry,counters,samples,milliseconds,
 scope:'Full original wave fallback on unchanged cloned state and native body/route/exterior checks. No actual spawn, dropped animal, balance result or GPU acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({actors:result.actors,counters,milliseconds}));
