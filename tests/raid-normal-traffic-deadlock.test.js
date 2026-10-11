import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';

for(const reload of [false,true])for(const dt of [1,.1])test(`retained normal Sabana night11 traffic completes physically, reload=${reload}, dt=${dt}`,()=>{
 let state=deserialize(gunzipSync(readFileSync(new URL('./fixtures/normal-123-raid-traffic.json.gz',import.meta.url))).toString());
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
 const ledger=structuredClone(state.ledger),start=state.elapsed;let reloaded=false,raidEnded=false;
 assert.equal(state.result,null);assert.equal(state.day,11);assert(state.raid);
 for(let i=0;i<360/dt&&state.raid;i++){
  const before=new Map(state.raid.animals.map(a=>[a.id,{x:a.x,z:a.z,radius:a.radius}]));
  Game.tick(state,dt,nav);
  const actors=state.raid?.animals.filter(a=>a.status!=='gone')??[];
  for(const a of actors){
   const prior=before.get(a.id);if(prior)assert(Math.hypot(a.x-prior.x,a.z-prior.z)<=3.8*dt+1e-7,'No teleport or extra speed');
   for(const b of actors){if(a.id>=b.id)continue;
    const pa=before.get(a.id),pb=before.get(b.id);if(!pa||!pb)continue;
    const previous=Math.hypot(pa.x-pb.x,pa.z-pb.z),required=a.radius+b.radius;
    assert(Math.hypot(a.x-b.x,a.z-b.z)>=Math.min(previous,required)-1e-7,'No new body interpenetration');
   }
  }
  if(reload&&!reloaded&&state.elapsed-start>=30&&state.raid){state=deserialize(serialize(state));nav.setState(state);reloaded=true;}
  raidEnded=state.events.some(e=>e.type==='RaidEnded');
 }
 assert.equal(reloaded,reload);assert.equal(state.raid,null);assert(raidEnded,'Native RaidEnded required');
 assert.equal(state.completedNights,11);assert.equal(state.day,12);assert.equal(state.result,null);
 assert.deepEqual(state.ledger,ledger,'No synthetic income, repairs or losses');
});
