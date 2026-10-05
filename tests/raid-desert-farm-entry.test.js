import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Navigation} from '../src/world/navigation.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {tick} from '../src/simulation/game.js';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
const group=['warthog','hyena','buffalo','lion','rhino'];
const recorded=JSON.parse(readFileSync(new URL('../docs/qa/raid-spawn-navigation/prepared-complete-browser-desert.json',import.meta.url)));
function fixture(){
 const context=recorded.timing.navigationContext,s=deserialize(context.state),nav=new Navigation(s.seed,s.biome,JSON.parse(readFileSync(new URL('../public/content/biome-desert.json',import.meta.url))).profile);
 nav.setState(s);nav.setActiveBounds(context.activeBounds);nav.setRaidView(context.raidView.eye,context.raidView.target);return {s,nav};
}
for(const species of [...group,'complete-group'])test(`recorded desert ${species}: real reachable approach produces a physical structure hit`,()=>{
 const {s,nav}=fixture(),chosen=species==='complete-group'?group:[species],center=s.structures[0],hp=center.hp;
 s.nightPlan={at:400,group:chosen,done:false};let request;
 const worker={postMessage(data){request=data;},terminate(){}},preparer=new RaidEntryPreparer(nav,{createWorker:()=>worker});preparer.update(s);
 const before=serialize(s);worker.onmessage({data:computeRaidEntry(request)});assert.equal(serialize(s),before);
 spawnRaid(s,{group:chosen},nav);assert.equal(preparer.stats.used,1);assert.ok(s.raid);
 const births=s.raid.animals.map(a=>({...a}));
 for(const a of births){assert.ok(Math.hypot(a.x-center.x,a.z-center.z)<40);assert.ok(nav.segmentClear(a,a.exit,a.radius,null,false));}
 for(let i=0;i<births.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(births[i].x-births[j].x,births[i].z-births[j].z)>births[i].radius+births[j].radius+1);
 let steps=0;while(center.hp===hp&&s.raid&&steps++<600)tick(s,.05,nav);
 assert.ok(center.hp<hp,'A complete attack must damage the actual centre');
 const hit=s.events.find(e=>e.type==='StructureHit');assert.ok(hit);assert.equal(hit.targetId,center.id);
 assert.ok(births.some(a=>a.id===hit.animalId));assert.equal(s.result,null);
 assert.equal(serialize(deserialize(serialize(s))),serialize(s));preparer.dispose();
});
