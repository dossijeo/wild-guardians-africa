import test from 'node:test';
import assert from 'node:assert/strict';
import {boundaryFaces} from '../src/world/boundary-faces.js';
import {boundaryFaces as reference} from './fixtures/boundary-faces-reference.js';
const segment=(id,a,b)=>({id,hp:100,maxHp:100,kind:'wall',material:'zarzas',x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),scaleX:Math.hypot(b[0]-a[0],b[1]-a[1])/2.18});
const ring=(points,start=1)=>points.map((p,i)=>segment(start+i,p,points[(i+1)%points.length]));
const compare=pieces=>{const before=JSON.stringify(pieces);assert.deepEqual(boundaryFaces(pieces),reference(pieces));assert.equal(JSON.stringify(pieces),before);};

test('preserves recovered graph at epsilon joins, crossings, T junctions and reversed input order',()=>{
 for(const shift of [-100,-.2,-.1,0,.1,.2,100])for(const gap of [.099999999,.1,.100000001]){
  const p=ring([[shift,0],[shift+4,0],[shift+4,4],[shift,4]]);
  p.push(segment(5,[shift+2,-2],[shift+2,6]),segment(6,[shift-2,2],[shift+6,2]),segment(7,[shift+gap,0],[shift+gap,2]));
  compare(p);compare([...p].reverse());
 }
});
test('deterministic differential coverage for mixed closed/open/intersecting graphs',()=>{
 let seed=2026;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let trial=0;trial<180;trial++){
  const p=[];let id=1;
  for(let r=0;r<3;r++){
   const x=(random()-.5)*20,z=(random()-.5)*20,w=1+random()*5,h=1+random()*5;
   p.push(...ring([[x,z],[x+w,z],[x+w,z+h],[x,z+h]],id));id+=4;
  }
  for(let i=0;i<18;i++)p.push(segment(id++,[(random()-.5)*30,(random()-.5)*30],[(random()-.5)*30,(random()-.5)*30]));
  for(let i=0;i<p.length;i++){p[i].material=['zarzas','adobe','piedra'][i%3];if(i%11===0)p[i].collapse=true;else if(i%13===0)p[i].hp=0;}
  compare(p);
 }
});
test('keeps earliest-node merging and distant-coordinate fallback identical',()=>{
 for(const offset of [0,-1000,1e15,-1e15]){
  const p=ring([[offset,0],[offset+4,0],[offset+4,4],[offset,4]]);
  p.push(segment(5,[offset+.06,0],[offset+2,2]),segment(6,[offset+.12,0],[offset+2,3]),segment(7,[offset+.08,0],[offset+1,1]));
  compare(p);
 }
});
