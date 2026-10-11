import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {animalExitConnector} from '../src/simulation/animal-exit-connectors.js';

const bytes=readFileSync(new URL('../docs/qa/integrated-spiritual-survival/pilot-v47-good-q9-empalizada-short-yield-sabana-123-twentyone/partial-state.json.gz',import.meta.url));
function setup(raw=gunzipSync(bytes).toString()){
 const state=deserialize(raw),profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
 return {state,nav,actor:state.raid.animals.find(a=>a.id==='animal-18948')};
}
function finish(actor,nav){
 let path=null;for(let i=0;i<4000&&!path;i++){
  const before=actor.exitConnectorSearch?.quarter?.visited??0;
  path=animalExitConnector(actor,actor.exit,nav);
  const after=actor.exitConnectorSearch?.quarter?.visited;
  if(after!==undefined)assert.ok(after-before<=8,'At most eight quarter-lattice pops per call');
 }
 assert.ok(path);let last=actor;
 for(const p of path){assert.ok(nav.walkable(p.x,p.z,actor.radius,null,false));assert.ok(nav.segmentClear(last,p,actor.radius,null,false));last=p;}
 assert.deepEqual(last,actor.exit);return path;
}

test('retained half-metre dead end has a swept quarter-metre route without relaxing body size',()=>{
 const {state,nav,actor}=setup(),ledger=structuredClone(state.ledger),rng=state.rng,position={x:actor.x,z:actor.z};
 assert.equal(actor.exitConnectorSearch.fine.visited,39);
 const path=finish(actor,nav);
 assert.ok(path.some(p=>Math.abs(p.x-position.x+.25)<1e-8));
 assert.equal(actor.radius,1.1);assert.deepEqual({x:actor.x,z:actor.z},position);
 assert.deepEqual(state.ledger,ledger);assert.equal(state.rng,rng);
});

test('pending finer search survives reload and corrupt frontiers are rejected',()=>{
 const first=setup();let pending=false;
 for(let i=0;i<4000;i++){
  assert.equal(animalExitConnector(first.actor,first.actor.exit,first.nav),null);
  if(first.actor.exitConnectorSearch?.quarter?.items.length){pending=true;break;}
 }
 assert.ok(pending);
 const saved=serialize(first.state),second=setup(saved);
 assert.deepEqual(finish(first.actor,first.nav),finish(second.actor,second.nav));
 for(const mutate of [q=>q.visited=4097,q=>q.previous['0,0']='0,1',q=>q.nodeCount=999999,q=>q.costs['1,0']=-1]){
  const corrupt=JSON.parse(saved);mutate(corrupt.raid.animals.find(a=>a.id==='animal-18948').exitConnectorSearch.quarter);
  assert.throws(()=>deserialize(JSON.stringify(corrupt)),/Conector fraccional fino inválido/);
 }
});

test('new geometry epoch invalidates a pending fine frontier',()=>{
 const {nav,actor}=setup();for(let i=0;i<4000&&!actor.exitConnectorSearch?.quarter;i++)animalExitConnector(actor,actor.exit,nav);
 assert.ok(actor.exitConnectorSearch.quarter);nav.version++;
 animalExitConnector(actor,actor.exit,nav);
 assert.equal(actor.exitConnectorSearch.quarter,undefined);
 assert.equal(actor.exitConnectorSearch.next,8);
});
