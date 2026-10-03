import test from 'node:test';
import assert from 'node:assert/strict';
import {defensiveGroups} from '../src/simulation/defensive-groups.js';
const wall=(id,x,z,yaw=0,baseScaleX=1)=>({id,created:id,kind:'wall',status:'intact',hp:300,maxHp:300,cost:35,material:'adobe',x,z,yaw,baseScaleX});
test('Original native endpoints form chain, crossing and T groups; separated walls and a missing link split them',()=>{
 const s={structures:[wall('a',0,0),wall('b',2.18,0),wall('c',1,0,Math.PI/2),wall('d',3.27,1.09,Math.PI/2),wall('far',10,0)]};
 let g=defensiveGroups(s);assert.equal(g.length,2);assert.deepEqual(g[0].targets.map(t=>t.id),['a','b','c','d']);assert.equal(g[0].value,140);assert.equal(g[1].value,35);
 assert.equal(defensiveGroups(s),g,'Unchanged topology reuses cached components');s.structures[1].status='ruined';g=defensiveGroups(s);assert.equal(g.length,3);assert.equal(g.find(g=>g.id==='defense:a').value,70);
});
test('Gate and shortened native scales participate, while a real gap does not join',()=>{
 const gate={...wall('gate',0,0),gate:true},s={structures:[gate,wall('near',2.071,0,0,.5),wall('gap',6,0)]};
 const g=defensiveGroups(s);assert.equal(g.length,2);assert.equal(g.find(g=>g.targets.some(t=>t.id==='gate')).targets.length,2);
});
