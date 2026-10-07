import test from 'node:test';import assert from 'node:assert/strict';
import {mountainArcComposition} from '../src/rendering/mountain-arc-composition.js';
import {createMountainArcGeometry} from '../src/rendering/mountain-arcs.js';
const cells=Array.from({length:4},(_,cell)=>({baseline:.00184,uv:[(32+(cell%2)*1024)/2048,(264-Math.floor(cell/2)*256)/512,(992+(cell%2)*1024)/2048,(504-Math.floor(cell/2)*256)/512]}));
test('four decorative silhouettes are deterministic by seed without mutating source cells',()=>{
 const before=JSON.stringify(cells),a=mountainArcComposition(cells,712);
 assert.deepEqual(a,mountainArcComposition(cells,712));assert.notDeepEqual(a,mountainArcComposition(cells,713));assert.equal(before,JSON.stringify(cells));
 a[0].uv[0]=0;assert.notEqual(cells[0].uv[0],0);
 assert.throws(()=>mountainArcComposition(cells,NaN),/Invalid/);
});
test('arcs retain exact source aspect and open valleys in one bounded renderable',()=>{
 const arcs=mountainArcComposition(cells,712);let coverage=0;
 for(let i=0;i<4;i++){
  const span=arcs[i].height*4/430,next=arcs[(i+1)%4],gap=next.angle+(i===3?Math.PI*2:0)-arcs[i].angle-(span+next.height*4/430)/2;
  assert.ok(gap>.5);coverage+=span;assert.equal(arcs[i].aspect,4);
 }
 assert.ok(coverage<Math.PI*1.25);
 const geometry=createMountainArcGeometry(430,arcs);assert.equal(geometry.groups.length,0);assert.equal(geometry.index.count,288);geometry.dispose();
});
