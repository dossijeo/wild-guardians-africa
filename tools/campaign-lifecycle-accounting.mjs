// QA accounting lives outside Game state. It keeps aggregate outcomes while
// the engine retires crops and crates that can no longer affect gameplay.
import assert from 'node:assert/strict';
import {cropSpec} from '../src/simulation/rules.js';

const blank=()=>({planted:0,living:0,picked:0,destroyed:0,lostBeforeFirstWater:0,
  lostWithPendingWater:0,delivered:0,inTransit:0,income:0n,seedCosts:0n,
  livingSeedCosts:0n,pickedSeedCosts:0n,destroyedSeedCosts:0n});

export function createCampaignLifecycleAccounting(){
  const rows=new Map(),active=new Map(),pending=new Map();
  const row=species=>{if(!rows.has(species))rows.set(species,blank());return rows.get(species);};
  const crop=(state,id)=>state.plants.find(plant=>plant.id===id);
  return {
    observe(event,state){
      if(event.type==='CropPlaced'){
        const plant=crop(state,event.targetId);assert.ok(plant?.alive&&!active.has(plant.id));
        const cost=BigInt(cropSpec(plant.species).plant_cost),entry=row(plant.species);
        active.set(plant.id,{species:plant.species,cost});entry.planted++;entry.seedCosts+=cost;
      }else if(event.type==='CropPicked'||event.type==='CropDestroyed'){
        const record=active.get(event.targetId),plant=crop(state,event.targetId);
        assert.ok(record&&plant&&!plant.alive);active.delete(event.targetId);
        const entry=row(record.species);
        if(event.type==='CropPicked'){
          assert.ok(plant.growth>=cropSpec(plant.species).growth_seconds);
          assert.ok(plant.water.every(w=>['manual','magic'].includes(w.status)));
          assert.ok(!pending.has(event.crateId));pending.set(event.crateId,record.species);
          entry.picked++;entry.pickedSeedCosts+=record.cost;
        }else{
          entry.destroyed++;entry.destroyedSeedCosts+=record.cost;
          if(plant.water[0]?.status==='due')entry.lostBeforeFirstWater++;
          if(plant.water.some(w=>w.status==='due'))entry.lostWithPendingWater++;
        }
      }else if(event.type==='CrateDelivered'){
        const species=pending.get(event.targetId);assert.ok(species&&(!event.species||event.species===species));
        const charge=state.ledger.entries['deliver:'+event.targetId];assert.ok(charge&&charge.d==='1');
        pending.delete(event.targetId);const entry=row(species);entry.delivered++;entry.income+=BigInt(charge.n);
      }
    },
    report(state){
      const output=new Map([...rows].map(([species,entry])=>[species,{...entry}]));
      for(const [id,record] of active){assert.ok(state.plants.some(plant=>plant.id===id&&plant.alive));
        const entry=output.get(record.species);entry.living++;entry.livingSeedCosts+=record.cost;}
      assert.equal(state.plants.filter(plant=>plant.alive).length,active.size);
      for(const [id,species] of pending){assert.ok(state.crates.some(crate=>crate.id===id&&!crate.delivered&&crate.species===species));output.get(species).inTransit++;}
      assert.equal(state.crates.length,pending.size);
      return {bySpecies:Object.fromEntries([...output].map(([species,entry])=>[species,
        Object.fromEntries(Object.entries(entry).map(([key,value])=>[key,typeof value==='bigint'?String(value):value]))]))};
    }
  };
}
