import {centerFootprint} from '../centers.js';
import {createSpatialWorld} from './spatial-world.js';
import {createSpatialChunkStream} from './spatial-chunk-stream.js';
import {createSpatialWallMirror} from './spatial-wall-mirror.js';
import {createSpatialCenterMirror} from './spatial-center-mirror.js';
import {createSpatialShieldMirror} from './spatial-shield-mirror.js';
import {addSpatialVillageBuildings} from './spatial-village-bridge.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from './spatial-movement-profiles.js';

// One authoritative WASM instance supplies the renderer and the actor graph.
// This is a Sabana integration probe; it is not wired into normal gameplay.
export function createSpatialSavannaSession(module,state,streamOptions){
  if(state?.biome!=='sabana'||!Array.isArray(state.villages)||!state.villages.length)
    throw TypeError('Expected a Sabana game state with a village');
  if(state.suppressed?.length)
    throw Error('Procedural prop suppression is not yet supported by this spatial session');
  const core=createSpatialWorld(module),first=state.villages[0];
  const cx=Math.floor((first.x+24)/48),cz=Math.floor((first.z+24)/48);
  core.generate(state.seed,cx,cz,state.biome);
  const villages=new Map();
  function installVillage(village,gameState,initial=false){
    if(village?.id==null||villages.has(village.id)||!Array.isArray(village.buildings))
      throw TypeError('Expected a new spatial village with buildings');
    const footprints=[...village.buildings.filter(b=>b.kind!=='Zona común').map(b=>b.footprint),
      ...gameState.structures.filter(s=>s.kind==='center'&&s.villageId===village.id&&
        s.status!=='ruined').map(s=>centerFootprint(s,gameState).footprint)];
    const points=footprints.flat();
    if(!points.length)throw TypeError('A spatial village needs physical buildings');
    const hx=Math.max(...points.map(p=>Math.abs(p.x-village.x)))+1.25;
    const hz=Math.max(...points.map(p=>Math.abs(p.z-village.z)))+1.25;
    if(![village.x,village.z,hx,hz].every(Number.isFinite)||hx>100||hz>100)
      throw RangeError('Spatial settlement exceeds supported bounds');
    const level=initial?core.setSettlement(village.x,village.z,hx,hz):
      core.addSettlement(village.x,village.z,hx,hz);
    if(!Number.isFinite(level))throw Error('Could not create spatial settlement');
    villages.set(village.id,addSpatialVillageBuildings(core,village));
  }
  for(const village of state.villages)installVillage(village,state,village===first);
  const walls=createSpatialWallMirror(core),centers=createSpatialCenterMirror(core),
    shields=createSpatialShieldMirror(core);
  walls.sync(state.structures);centers.sync(state);shields.sync(state.spells);
  const profiles=new Set();
  function selectProfile(profile){
    if(!profiles.has(profile.index)){
      core.buildNavigationProfile(profile.index,profile.radius,profile.worker);
      profiles.add(profile.index);
    }else core.selectNavigationProfile(profile.index);
  }
  selectProfile(WORKER_SPATIAL_PROFILE);
  selectProfile(ANIMAL_SPATIAL_PROFILES.warthog);
  const stream=createSpatialChunkStream(core,streamOptions);
  function syncState(next){
    if(next.seed!==state.seed||next.biome!==state.biome)
      throw TypeError('A spatial session cannot change seed or biome');
    if(next.suppressed?.length)
      throw Error('Procedural prop suppression is not yet supported by this spatial session');
    for(const village of next.villages)if(!villages.has(village.id))installVillage(village,next);
    walls.sync(next.structures);centers.sync(next);shields.sync(next.spells);
  }
  function routeActor(start,end,{worker=true,species='warthog'}={}){
    const profile=worker?WORKER_SPATIAL_PROFILE:ANIMAL_SPATIAL_PROFILES[species];
    if(!profile)throw RangeError('Unsupported spatial actor profile');
    selectProfile(profile);
    return core.routeWorld(start,end);
  }
  return {core,stream,syncState,routeActor,dispose:()=>stream.dispose()};
}
