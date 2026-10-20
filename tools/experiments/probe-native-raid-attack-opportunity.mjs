import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {chooseRaidEntry,reachableApproach} from '../../src/simulation/raids.js';
import {raidWallEnvelope} from '../../src/simulation/raid-exterior-entry.js';
import {animalSpec,randomInt} from '../../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';

const [fixture,output]=process.argv.slice(2);
if(!fixture||!output)throw TypeError('Usage: probe-native-raid-attack-opportunity.mjs SNAPSHOT.json.gz OUTPUT.json');
const frozen=JSON.parse(gunzipSync(readFileSync(fixture)).toString());
const state=deserialize(frozen.state),before=serialize(state);
if(!state.nightPlan?.group?.length||state.raid)throw Error('Expected a pending night raid');
const module=new WebAssembly.Module(readFileSync(
  process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
  'src/world/wild-engine/spatial-savanna.wasm'));
const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  for(const key of frozen.navigation.residentChunks){
    const [cx,cz]=key.split(',').map(Number);
    if(session.core.selectChunk(cx,cz)<0&&session.core.addChunk(cx,cz)<0)
      throw Error(`Failed to load resident chunk ${key}`);
    loaded.set(key,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state);
  nav.setActiveBounds(frozen.navigation.bounds);
  nav.setRaidView(frozen.navigation.view.eye,frozen.navigation.view.target);
  const group=state.nightPlan.group;
  const specs=group.map(id=>({spec:animalSpec(id),
    radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
  const preferredSide=randomInt({rng:state.rng},0,3);
  const entry=chooseRaidEntry(state,specs,nav.activeBounds,preferredSide,nav);
  if(!entry?.entries||entry.entries.length!==group.length)throw Error('Incomplete raid formation');
  const crops=state.plants.filter(plant=>plant.alive);
  const speciesSeen=new Set(),rows=[];
  const box=raidWallEnvelope(state,nav),alternateExterior=[];
  for(let index=0;index<group.length;index++){
    const species=group[index];
    if(speciesSeen.has(species))continue;
    speciesSeen.add(species);
    const origin=entry.entries[index],actor={...origin,id:`probe-${species}`,
      species,radius:specs[index].radius};
    const candidates=[...crops].sort((a,b)=>
      Math.hypot(a.x-origin.x,a.z-origin.z)-Math.hypot(b.x-origin.x,b.z-origin.z)||
      a.id.localeCompare(b.id));
    let unknown=0;
    const found=[];
    for(const crop of candidates){
      const approach=reachableApproach(actor,crop,nav,null,()=>unknown++);
      if(approach)found.push({cropId:crop.id,point:approach.point,
        routePoints:approach.path.length});
    }
    rows.push({species,origin,radius:actor.radius,cropsTested:candidates.length,
      unknownAttempts:unknown,found});
  }
  if(process.env.WILD_PROBE_ALT_EXTERIOR==='1'&&box){
    const largestRadius=Math.max(...specs.map(item=>item.radius)),margin=largestRadius+4;
    for(const fraction of [.2,.5,.8]){
      const x=box[0]+(box[2]-box[0])*fraction,
        z=box[1]+(box[3]-box[1])*fraction;
      for(const point of [{x:box[0]-margin,z},{x:box[2]+margin,z},
        {x,z:box[1]-margin},{x,z:box[3]+margin}]){
        const perSpecies=[];
        for(const {species,radius} of rows){
          const standable=session.actorCanStand(point,{worker:false,species});
          const exterior=standable&&nav.spatialExteriorWitness(point,radius,box);
          let tested=0,unknown=0,found=null;
          if(exterior){
            const actor={...point,id:`alternate-${species}`,species,radius};
            const candidates=[...crops].sort((a,b)=>
              Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z)||
              a.id.localeCompare(b.id));
            for(const crop of candidates){
              const approach=reachableApproach(actor,crop,nav,null,()=>unknown++);
              tested++;
              if(approach){found={cropId:crop.id,point:approach.point};break;}
            }
          }
          perSpecies.push({species,standable,exterior,tested,unknown,found});
        }
        alternateExterior.push({point,perSpecies});
      }
    }
  }
  if(serialize(state)!==before)throw Error('Probe changed the game state');
  const report={biome:frozen.biome,seed:frozen.seed,day:state.day,
    residentChunks:loaded.size,entry,rows,alternateExterior,
    scope:'One actor per species at the selected formation point, plus optional twelve envelope points; uses the actual bounded crop attack approach, static attack ray and native route checks. Does not prove all possible exterior entries or reservations.'};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({day:report.day,
    species:rows.map(({species,cropsTested,unknownAttempts,found})=>
      ({species,cropsTested,unknownAttempts,found:found.length})),
    alternateFound:alternateExterior.flatMap(row=>row.perSpecies).filter(row=>row.found).length}));
}finally{session.dispose();}
