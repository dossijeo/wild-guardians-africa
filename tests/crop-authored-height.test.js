import test from 'node:test';
import assert from 'node:assert/strict';
import {authoredCropHeight} from '../src/rendering/crop-authored-height.js';
import {cropStageHeightManifest} from '../tools/experiments/bake_crop_stage_heights.mjs';
import {readFile} from 'node:fs/promises';

test('authored heights preserve the original batch interpolation at stage boundaries and intermediate growth',()=>{
 const heights=[.21,.7,1.1,1.8,2.4],marks=[.065,.27,.53,.78,1],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);},mix=(a,b,t)=>a+(b-a)*t;
 for(let i=-5;i<=1050;i++){const growth=i/1000;let expected;if(growth<marks[0]){const sy=mix(.045,1,smooth(growth/marks[0]));expected=.10+(heights[0]-.10)*sy;}else if(growth>=1)expected=heights[4];else{let a=0;while(a<3&&growth>=marks[a+1])a++;expected=mix(heights[a],heights[a+1],smooth(clamp((growth-marks[a])/(marks[a+1]-marks[a]),0,1)));}assert.equal(authoredCropHeight(heights,growth),expected);}
 assert.throws(()=>authoredCropHeight([1,2],.3),/heights/);
});

test('authored height manifest matches the hash-addressed crop GLB',async()=>{
 const generated=await cropStageHeightManifest(),committed=JSON.parse(await readFile('public/content/crop-stage-heights.json','utf8'));
 assert.deepEqual(committed,generated);assert.equal(Object.keys(committed.heights).length,8);
});
