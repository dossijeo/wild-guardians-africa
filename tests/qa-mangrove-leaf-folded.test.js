import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
for(const variant of ['folded','cupped'])test(`QA ${variant} leaves retain identical four-leaf LOD endpoints`,async()=>{
 const d=JSON.parse(await readFile(new URL(`../public/assets/visual-lab/mangrove-leaf-${variant}-20261022/modules.json`,import.meta.url),'utf8'));
 for(const [name,count]of [['refined',8],['light',4]]){const m=d[name];assert.equal(m.position.length,count*7*3);assert.equal(m.index.length,count*6*3);for(const values of Object.values(m))assert.ok(values.every(Number.isFinite));assert.ok(m.index.every(i=>Number.isInteger(i)&&i>=0&&i<m.position.length/3));}
 for(const attr of ['position','flatPosition','normal','flatNormal','bladeRoot','uv']){const stride=attr==='uv'?2:3;for(const [i,leaf]of [0,2,5,7].entries())assert.deepEqual(d.refined[attr].slice(leaf*7*stride,(leaf+1)*7*stride),d.light[attr].slice(i*7*stride,(i+1)*7*stride),`${attr} leaf ${leaf}`);}
 for(const m of Object.values(d)){assert.deepEqual(m.normal,m.flatNormal,'far crease normals retained');for(let i=0;i<m.normal.length;i+=3)assert.ok(Math.abs(Math.hypot(...m.normal.slice(i,i+3))-1)<1e-5);}
});
