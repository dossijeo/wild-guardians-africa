import {prepareNaturalWaterBed} from '../../src/rendering/natural-water-edges.js';
// QA candidate: keep the geometry private and retain the original sampling order.
export function* prepareChunkWaterBed(world,geometry,cx,cz,{now=()=>performance.now(),sliceMs=.75}={}){
 const stats=globalThis.qaChunkWaterBed??={calls:0,yields:0};stats.calls++;
 const steps=prepareNaturalWaterBed(world,geometry,cx,cz);let start=now();
 try{for(;;){const step=steps.next();if(step.done)return step.value;if(now()-start>=sliceMs){stats.yields++;yield 'water-bed';start=now();}}}finally{steps.return();}
}
