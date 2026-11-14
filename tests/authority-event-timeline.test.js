import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createConfirmedStateReceiver} from '../src/simulation/confirmed-state-receiver.js';

test('real authority timestamps every event in an ordered raid batch without changing saved events',async()=>{
 const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
 const opening=await createSpatialCampaignOpening({seed:716,biome:'sabana',culture:'suajili',slotId:'timeline-authority'});
 opening.state.time=400;opening.state.elapsed=400;opening.state.initialPreparation=false;opening.state.nightPlan={at:400,done:false,group:['warthog']};
 const initial=serialize(opening.state),authority=createSimulationAuthority(module,initial,[...opening.loaded.keys()]),state=deserialize(initial),receiver=createConfirmedStateReceiver(state,'timeline');let seen=0,previous=state.elapsed;
 try{
  for(let sequence=1;sequence<=30;sequence++){
   const publication=authority.execute({kind:'advance',sequence,seconds:.05,nightFastForward:true,steps:3});
   const facts=publication.presentationJournal.filter(f=>f.kind==='event');
   if(publication.events.length){seen+=publication.events.length;assert.equal(publication.presentationJournalVersion,2);assert.deepEqual(facts.map(f=>f.eventId),publication.events.map(e=>e.id));}
   for(const fact of publication.presentationJournal){assert.ok(fact.at>=previous&&fact.at<=publication.elapsed);previous=fact.at;}
   assert.equal(receiver.accept({...publication,session:'timeline'}).accepted,true);
   for(const event of publication.events)assert.equal(Object.hasOwn(event,'at'),false);
   previous=publication.elapsed;
  }
  assert.ok(seen>0,'the real raid emitted events');
 }finally{authority.dispose();opening.session.dispose();}
});
