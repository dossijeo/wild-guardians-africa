// Replays the frozen funded day-7 contour against the pre-optimization proof.
// Run from the repository root: node tools/experiments/benchmark-service-proof-certificate.mjs
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import * as Game from '../../src/simulation/game.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {centerFootprint} from '../../src/world/centers.js';
import {operational} from '../../src/simulation/rules.js';
import {nativeServiceComponentProof as current} from '../native-service-component-proof.mjs';

const root=new URL('../../',import.meta.url);
const source=execFileSync('git',['show','84c6ad77:tools/native-service-component-proof.mjs'],{cwd:root,encoding:'utf8'});
const cache=new URL('../../.cache/',import.meta.url);mkdirSync(cache,{recursive:true});
const priorUrl=new URL('native-service-component-proof-reference.mjs',cache);
writeFileSync(priorUrl,source);
const {nativeServiceComponentProof:prior}=await import(priorUrl.href);
const fixture=name=>gunzipSync(readFileSync(new URL(`../../docs/qa/integrated-spiritual-survival/${name}.gz`,import.meta.url))).toString();
const raw=fixture('day7-funded-state.json'),report=JSON.parse(fixture('day7-funded-policy.json'));
const radii=[...new Set(Object.values(ANIMAL_ACTIONS.animals).map(a=>a.presentation.footprint.radius))];
const profile=JSON.parse(readFileSync(new URL(`../../public/content/biome-${BIOME_IDS.sabana}.json`,import.meta.url),'utf8')).profile;
let reference;
for(const arm of ['A','B','B','A']){
 const s=deserialize(raw),nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 const plan=Game.quoteWallChain(s,report.material,report.planned.points,nav,{smooth:false,snap:false});
 const updates=new Map(plan.updates.map(q=>[q.id,q]));
 const view=nav.forBuildingPlacement({id:'qa-empty-proposal',x:1e12,z:1e12,radius:0,kind:'house'});
 view.obstacles=[...nav.obstacles.map(w=>updates.has(w.id)?{...w,...updates.get(w.id)}:w),...plan.pieces];
 const targets=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational)];
 const land=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational).flatMap(c=>centerFootprint(c,s).footprint)];
 const before=serialize(s),results=[],start=performance.now();
 for(const radius of radii){
  const inside=s.plants.find(p=>p.alive&&view.walkable(p.x,p.z,radius,null,false));
  const b=report.planned.bounds;
  const outside=[{x:b[2]+6,z:inside.z},{x:b[0]-6,z:inside.z},{x:inside.x,z:b[1]-6},{x:inside.x,z:b[3]+6}].find(p=>view.walkable(p.x,p.z,radius,null,false));
  assert.equal(view.approachPath(outside,inside,radius,32),null);
  assert.equal(view.approachGroupBlocked(outside,land,radius,.6+radius),false);
  results.push((arm==='A'?prior:current)(s,view,targets,radius,outside,report.planned.points));
 }
 if(reference)assert.deepEqual(results,reference);else reference=results;
 assert.equal(serialize(s),before);
 console.log(JSON.stringify({arm,ms:Math.round(performance.now()-start),exactResults:true,valid:results.every(x=>x.valid)}));
}
