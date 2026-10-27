import {transact,rational} from '../../src/simulation/money.js';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as Game from '../../src/simulation/game.js';
import {serialize} from '../../src/persistence/snapshots.js';
import {centerServicePoint} from '../../src/world/centers.js';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import {WILD_ENGINE_WORLD_VERSION} from '../../src/world/wild-engine/world-version.js';
const opening=await createSpatialCampaignOpening({seed:37,biome:'manglares',mangroveNetwork:true,slotId:'estuary-worker-crossing'});
try{
 const {state,nav}=opening,entry=state.villages[0].entry??state.villages[0];
 transact(state.ledger,'qa-expansion-funds',rational(1000));
 state.wildEngineWorldVersion=WILD_ENGINE_WORLD_VERSION;

 const wanted=new Map();for(let cz=Math.floor((entry.z-120+24)/48);cz<=Math.floor((entry.z+120+24)/48);cz++)for(let cx=Math.floor((entry.x-120+24)/48);cx<=Math.floor((entry.x+120+24)/48);cx++)wanted.set(`${cx},${cz}`,{cx,cz,score:0});opening.session.stream.plan(wanted);await opening.session.stream.whenIdle();
 nav.setActiveBounds([entry.x-96,entry.z-96,entry.x+96,entry.z+96]);
 let selected=null;
 for(const distance of [64,72,80]){
  for(let i=0;i<24;i++){
   const x=entry.x+Math.cos(i*Math.PI/12)*distance,z=entry.z+Math.sin(i*Math.PI/12)*distance;
   const preview=Game.previewCenter(state,{x,z,yaw:0},nav);if(!preview.valid)continue;
   const destination=centerServicePoint(preview,state,.8),route=nav.path(entry,destination,.28,null,true);
   if(route?.some(p=>nav.field.waterInfo(p.x,p.z).inside)){selected={preview,destination,route};break;}
  }
  if(selected)break;
 }
 assert(selected,'No buildable cross-channel work center found');
 assert(Game.placeStructure(state,'qa-cross-channel-center',selected.preview,nav));
 const center=state.structures.at(-1);let plant=null;
 for(const distance of [4,5,6,7,8]){
  for(let i=0;i<16;i++){
   const x=center.x+Math.cos(i*Math.PI/8)*distance,z=center.z+Math.sin(i*Math.PI/8)*distance;
   if(!nav.placement(x,z,.4).valid)continue;
   try{Game.plant(state,'qa-cross-channel-crop','mijo',x,z,nav);plant=state.plants.at(-1);break;}catch(e){if(!/terreno|árbol|espacio|agua|obstáculo/i.test(e.message))throw e;}
  }
  if(plant)break;
 }
 assert(plant);assert.equal(plant.centerId,center.id);
 const cropRoute=nav.path(entry,plant,.28,null,true);console.log(JSON.stringify({cropRouteWet:cropRoute?.filter(p=>nav.field.waterInfo(p.x,p.z).inside).length,cropRouteLength:cropRoute?.length}));
 assert(cropRoute?.some(p=>nav.field.waterInfo(p.x,p.z).inside),'Final crop route must cross water');
 Game.openInitialHiring(state);Game.hire(state,'qa-cross-channel-worker',{olderFemale:1});assert.equal(state.workers.length,1);
 assert.equal(state.workers[0].centerId,center.id);
 state.tutorial.step='done';Game.pause(state,'menu');
 const out='docs/qa/mangrove-magic-20261026/worker-crossing';await mkdir(out,{recursive:true});
 await writeFile(out+'/fixture.json',JSON.stringify({slotId:state.slotId,snapshot:serialize(state),scope:'QA grants 1000 coins, then pays for second work center and crop across native estuary channel, paid worker starts at village; no worker teleports or scripted route.',selected,centerId:center.id,plantId:plant.id},null,2));
 console.log(JSON.stringify({entry,center,plant,network:state.mangroveNetwork,routePoints:selected.route.length,wetRoutePoints:selected.route.filter(p=>nav.field.waterInfo(p.x,p.z).inside).length}));
}finally{opening.dispose();}

