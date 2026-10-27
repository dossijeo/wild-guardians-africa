import assert from 'node:assert/strict';
export function patchChunkWaterScene(source){
 const integrated='const bedSteps=prepareNaturalWaterBedIncremental(this,waterGeometry,cx,cz);';
 if(source.includes(integrated)){assert.equal(source.split(integrated).length,2);return "import {prepareChunkWaterBed} from '/tools/experiments/chunk-water-bed-candidate.js';\n"+source.replace(integrated,'const bedSteps=prepareChunkWaterBed(this,waterGeometry,cx,cz);');}
 const anchor='if(waterMaterial!==this.fluidMaterial)prepareNaturalWater(this,waterGeometry,cx,cz,waterMaterial,payload?.waterBed);';assert.equal(source.split(anchor).length,2);
 return "import {prepareChunkWaterBed} from '/tools/experiments/chunk-water-bed-candidate.js';\n"+source.replace(anchor,"if(waterMaterial!==this.fluidMaterial){let bed=payload?.waterBed;if(asynchronous&&!bed){yield 'water-bed';bed=yield* prepareChunkWaterBed(this,waterGeometry,cx,cz);yield 'water-edges';}prepareNaturalWater(this,waterGeometry,cx,cz,waterMaterial,bed);}");
}
