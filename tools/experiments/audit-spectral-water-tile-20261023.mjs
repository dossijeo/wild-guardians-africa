import * as THREE from 'three';
import {readFile,writeFile} from 'node:fs/promises';
import {createWaterSlopeTexture} from '../../src/rendering/global-water-surface.js';
const source=await readFile('src/rendering/global-water-surface.js','utf8'),patch=await readFile('tools/experiments/qa-spectral-water-generator-20261023.txt','utf8');
const helper=source.slice(source.indexOf('const fract='),source.indexOf('export function createWaterSlopeTexture'));
const fn=new Function('THREE',helper+`return function(){${patch}return data;}`)(THREE);
function stats(data){let energy=0,clipped=0;for(const x of data){energy+=(x/255*3-1.5)**2;if(x===0||x===255)clipped++;}return {bytes:data.length,rms:Math.sqrt(energy/data.length),clippedChannels:clipped};}
const original=createWaterSlopeTexture();const result={baseline:stats(original.image.data),spectral:stats(fn()),note:'CPU data check, not rendering timing. RG8 quantization included; equal RMS normalization before quantization.'};original.dispose();await writeFile('docs/qa/global-visual-lab/canyon-spectral-ripples-20261023/tile-audit.json',JSON.stringify(result,null,2)+'\n');console.log(result);
