import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {animalExitConnector} from '../src/simulation/animal-exit-connectors.js';
import {updateRaid} from '../src/simulation/raids.js';
import {validExitFrontier} from '../src/persistence/exit-connector-snapshot.js';

const raw=gunzipSync(readFileSync(new URL('../docs/qa/integrated-spiritual-survival/recovery-night41-technical-stop/partial-state.json.gz',import.meta.url))).toString();
function setup(saved=raw){
 const state=deserialize(saved),profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
 const actor=state.raid.animals.find(a=>a.id==='animal-44975');
 // Reconstruct the saved geometry epoch as well as its geometry; otherwise
 // the first connector call would discard the very frontier being tested.
 nav.version=JSON.parse(actor.exitConnectorSearch.key)[0];
 return {state,nav,actor};
}
function finish(actor,nav){
 let path=null;
 for(let calls=0;calls<6000&&!path;calls++){
  const before=actor.exitConnectorSearch?.fine?.visited??0;
  path=animalExitConnector(actor,actor.exit,nav);
  const after=actor.exitConnectorSearch?.fine?.visited;
  if(after!==undefined)assert(after-before<=8,'same bounded per-update work');
 }
 assert(path,'original capped frontier can resume and find a physical route');
 let previous=actor;
 for(const point of path){assert(nav.walkable(point.x,point.z,actor.radius,null,false));assert(nav.segmentClear(previous,point,actor.radius,null,false));previous=point;}
 assert.deepEqual(previous,actor.exit);return path;
}
test('night-41 lion resumes original capped search without relaxing radius or obstacles',()=>{
 const {state,nav,actor}=setup(),rng=state.rng,ledger=structuredClone(state.ledger),structures=JSON.stringify(state.structures),position={x:actor.x,z:actor.z};
 assert.equal(actor.exitConnectorSearch.fine.visited,4096);assert.equal(actor.radius,.85);
 assert.equal(nav.segmentClear(actor,actor.exit,actor.radius,null,false),false);
 finish(actor,nav);
 assert.deepEqual({x:actor.x,z:actor.z},position);assert.equal(actor.radius,.85);
 assert.equal(state.rng,rng);assert.deepEqual(state.ledger,ledger);assert.equal(JSON.stringify(state.structures),structures);
});
test('expanded pending search roundtrips and preserves the deterministic route',()=>{
 const first=setup();
 while(first.actor.exitConnectorSearch.fine.visited<5000)assert.equal(animalExitConnector(first.actor,first.actor.exit,first.nav),null);
 assert.equal(first.actor.exitConnectorSearch.fine.limit,16384);
 assert(validExitFrontier(first.actor.exitConnectorSearch.fine));
 assert.equal(validExitFrontier(first.actor.exitConnectorSearch.fine,4096),false,'quarter lattice cannot adopt the expanded half-lattice bound');
 const second=setup(serialize(first.state));
 assert.deepEqual(finish(first.actor,first.nav),finish(second.actor,second.nav));
 const corrupt=JSON.parse(serialize(second.state));
 corrupt.raid.animals.find(a=>a.id==='animal-44975').exitConnectorSearch={key:'bad',next:192,fine:{limit:65536}};
 assert.throws(()=>deserialize(JSON.stringify(corrupt)),/Conector fraccional inválido/);
});
test('native retreat movement lets the retained zero-hit lion physically leave and ends the raid',()=>{
 const {state,nav,actor}=setup(),ledger=structuredClone(state.ledger),radius=actor.radius;let steps=0;
 while(state.raid&&steps++<12000){state.elapsed+=.1;updateRaid(state,.1,nav);}
 assert.equal(state.raid,null,'no forced dawn or actor removal');assert.equal(actor.status,'gone');
 assert.equal(actor.hitsRemaining,0);assert.equal(actor.radius,radius);assert.deepEqual(state.ledger,ledger);
 assert(Math.hypot(actor.x-actor.exit.x,actor.z-actor.exit.z)<1);
});
