import {prepareNaturalWaterBedIncremental} from '../../src/rendering/natural-water-edges.js';
// QA counters only; use the same coalescing implementation as asset water.
export function* prepareChunkWaterBed(world,geometry,cx,cz,options={}){
 const stats=globalThis.qaChunkWaterBed??={calls:0,yields:0};stats.calls++;
 const worlds=globalThis.qaChunkWaterByWorld??=new WeakMap();let local=worlds.get(world);if(!local){local={calls:0,yields:0};worlds.set(world,local);}local.calls++;
 const steps=prepareNaturalWaterBedIncremental(world,geometry,cx,cz,options);
 try{for(;;){const step=steps.next();if(step.done)return step.value;stats.yields++;local.yields++;yield 'water-bed';}}
 finally{steps.return();}
}
