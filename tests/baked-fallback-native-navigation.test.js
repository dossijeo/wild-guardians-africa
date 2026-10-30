import {villageLayout} from '../src/world/villages.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Group} from 'three';
import {beastSkin} from './helpers/beast-skin.js';
import {BakedBeastFallbacks} from '../src/rendering/baked-beast-fallbacks.js';
import {BakedRagdollClip} from '../src/simulation/baked-ragdoll-clip.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';

const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const villagePack=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url)))[0];
const base=new URL('../public/content/guardian/ragdoll-fallback/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('falls.json',base)));
const bytes=readFileSync(new URL('falls.bin',base));
const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const clips=new Map(manifest.clips.map(c=>[c.species+':'+c.direction,new BakedRagdollClip(c,buffer)]));

test('overflow falls use valid native species profiles and respect rejected movement',()=>{
 for(const species of ['hyena','lion','warthog','buffalo','rhino']){
  const state={seed:'712',biome:'sabana',villages:[{id:"village-1",x:0,z:0,buildings:villageLayout(villagePack,0,0)}],structures:[],spells:[],suppressed:[],elapsed:0};
  const session=createSpatialGameSession(module,state,{loaded:()=>new Map(),onData:()=>{}});
  try{
   const native=createSpatialNavigationMovement(session,state),model=beastSkin(species),root=new Group();root.add(model);root.updateMatrixWorld(true);
   // Deliberately stale presentation radius must not select a worker or an
   // invented native footprint. Species owns the navigation profile.
   const animal={id:species,species,x:0,z:0,radius:.8,heading:0,status:'walking',magicImpact:{direction:{x:1,y:0,z:0},impactAt:0}};
   state.raid={animals:[animal]};let calls=0;
   const world={state,mixers:new Map([[species,{model}]]),objects:new Map([[species,root]]),nav:{field:{surface:()=>0},segmentClear:(...args)=>{calls++;native.segmentClear(...args);return false;}}};
   const manager=new BakedBeastFallbacks(world,clips);
   assert.equal(manager.start(animal),true);
   const fall=manager.entries.get(species).fall,start=fall.initialHip.clone();
   // Run the native contract, then impose a blocked segment. Articulation and
   // vertical support may continue, but horizontal motion must stay put.
   assert.doesNotThrow(()=>fall.apply(.5),species);
   assert.ok(calls>0,species);
   assert.ok(Math.hypot(fall.hip.x-start.x,fall.hip.z-start.z)<1e-6,species);
   assert.ok(Number.isFinite(fall.hip.y));
   manager.dispose();assert.equal(animal.magicDown,undefined);
  }finally{session.dispose();}
 }
});
