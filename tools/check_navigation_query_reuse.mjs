import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as Game from '../src/simulation/game.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from './check_opening.mjs';
const root=process.argv[2];assert.ok(root,'Pass an explicit frozen reference root');
const ReferenceGame=await import(pathToFileURL(resolve(root,'src/simulation/game.js')));
const {Navigation:ReferenceNavigation}=await import(pathToFileURL(resolve(root,'src/world/navigation.js')));
const rows=[];
for(const biome of Object.keys(BIOME_IDS)){
 const fixture=JSON.parse(readFileSync(new URL(`../docs/qa/populated-raids/${biome}.json`,import.meta.url))),context=fixture.timing.navigationContext;
 const profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${BIOME_IDS[biome]}.json`,import.meta.url))).profile;
 const make=Class=>{
  const s=deserialize(context.state),nav=new Class(s.seed,s.biome,profile);nav.setState(s);nav.setActiveBounds(context.activeBounds);nav.setRaidView(context.raidView.eye,context.raidView.target);
  for(const key of context.warmedChunks){const [x,z]=key.split(',').map(Number);nav.chunk(x,z);}
  return {s,nav};
 };
 const reference=make(ReferenceNavigation),candidate=make(Navigation);
 ReferenceGame.tick(reference.s,0,reference.nav);Game.tick(candidate.s,0,candidate.nav);
 assert.equal(serialize(reference.s),serialize(candidate.s));
 // The same populated native fixture used for raid entry acceptance. Actor
 // geometry, collisions and paid workforce remain in the original saved state.
 const {spawnRaid}=await import('../src/simulation/raids.js');
 const ReferenceRaids=await import(pathToFileURL(resolve(root,'src/simulation/raids.js')));
 ReferenceRaids.spawnRaid(reference.s,fixture.plan,reference.nav);spawnRaid(candidate.s,fixture.plan,candidate.nav);
 let referenceQueries=0,candidateQueries=0;
 for(const [world,increment] of [[reference,()=>referenceQueries++],[candidate,()=>candidateQueries++]]){const find=world.nav.findPath;world.nav.findPath=function(...args){increment();return find.apply(this,args);};}
 for(let step=0;step<600;step++){
  ReferenceGame.tick(reference.s,.05,reference.nav);Game.tick(candidate.s,.05,candidate.nav);
  assert.equal(serialize(candidate.s),serialize(reference.s),`${biome} changed at step ${step}`);
 }
 rows.push({phase:'night-populated-raid',biome,steps:600,referenceQueries,candidateQueries,fullStateEqual:true});
 const opening=createOpeningWorld({biome}),center=opening.s.structures[0];
 for(let z=-9;z<=9&&opening.s.plants.length<8;z+=1.5)for(let x=5;x<=25&&opening.s.plants.length<8;x+=1.5){
  try{Game.plant(opening.s,'query-seed-'+opening.s.plants.length,'mijo',Math.round((center.x+x)/1.5)*1.5,Math.round((center.z+z)/1.5)*1.5,opening.nav);}catch{}
 }
 assert.equal(opening.s.plants.length,8,`${biome}: eight legally paid plants`);Game.openInitialHiring(opening.s);Game.hire(opening.s,'query-hire',{olderFemale:1,olderMale:1});opening.s.tutorial.step='done';opening.s.dayPlan={done:true};opening.s.nightPlan={done:true};
 const dayReference={s:deserialize(serialize(opening.s)),nav:new ReferenceNavigation(opening.s.seed,biome,profile)};dayReference.nav.setState(dayReference.s);
 for(const key of opening.nav.chunks.keys()){const [x,z]=key.split(',').map(Number);dayReference.nav.chunk(x,z);}
 let dayReferenceQueries=0,dayCandidateQueries=0;
 for(const [world,increment] of [[dayReference,()=>dayReferenceQueries++],[opening,()=>dayCandidateQueries++]]){const find=world.nav.findPath;world.nav.findPath=function(...args){increment();return find.apply(this,args);};}
 for(let step=0;step<2000;step++){ReferenceGame.tick(dayReference.s,.05,dayReference.nav);Game.tick(opening.s,.05,opening.nav);assert.equal(serialize(opening.s),serialize(dayReference.s),`${biome} daytime changed at step ${step}`);}
 const irrigated=opening.s.plants.filter(p=>p.water[0].status==='manual').length;assert.ok(irrigated>0,`${biome}: workers physically performed initial watering`);
 rows.push({phase:'paid-daytime-work',biome,steps:2000,plants:8,workers:2,irrigated,referenceQueries:dayReferenceQueries,candidateQueries:dayCandidateQueries,fullStateEqual:true});
}
console.log(JSON.stringify({scope:'Six native populated farm raid fixtures at 600 steps each, plus six paid first-day farms at 2000 steps each, full serialized state checked every step against an explicit frozen reference. No rendering, audio, frame timing or full campaign acceptance.',rows},null,2));
