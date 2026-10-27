import assert from 'node:assert/strict';
export function patchChunkWaterScene(source){
 const anchor='if(waterMaterial!==this.fluidMaterial)prepareNaturalWater(this,waterGeometry,cx,cz,waterMaterial,payload?.waterBed);';assert.equal(source.split(anchor).length,2);
 return "import {prepareChunkWaterBed} from '/tools/experiments/chunk-water-bed-candidate.js';\n"+source.replace(anchor,"if(waterMaterial!==this.fluidMaterial){let bed=payload?.waterBed;if(asynchronous&&!bed){yield 'water-bed';bed=yield* prepareChunkWaterBed(this,waterGeometry,cx,cz);yield 'water-edges';}prepareNaturalWater(this,waterGeometry,cx,cz,waterMaterial,bed);}");
}
