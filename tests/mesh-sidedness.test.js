import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {auditSidedness} from '../tools/mesh-sidedness.mjs';

const cube=()=>new THREE.BoxGeometry(2,2,2);
const audit=g=>auditSidedness(g.attributes.position.array,g.index.array);
test('closed outward geometry remains eligible across duplicated UV seams and rigid transforms',()=>{
  const g=cube(),result=audit(g);
  assert.equal(g.attributes.position.count,24);assert.equal(result.weldedVertices,8);
  assert.equal(result.closedOutward,true);assert.equal(result.components,1);
  assert.ok(Math.abs(result.signedVolumes[0]-8)<1e-12);
  g.rotateY(.4);g.translate(40,25,-90);
  assert.equal(audit(g).closedOutward,true);
  assert.ok(Math.abs(audit(g).signedVolumes[0]-8)<.0001);
});
test('open, inverted, inconsistent, duplicate and degenerate faces are rejected separately',()=>{
  const g=cube(),position=g.attributes.position.array,original=g.index.array;
  assert.ok(auditSidedness(position,original.slice(3)).openEdges>0);
  const inverse=original.slice();for(let i=0;i<inverse.length;i+=3)[inverse[i],inverse[i+1]]=[inverse[i+1],inverse[i]];
  const inside=auditSidedness(position,inverse);assert.equal(inside.closedOutward,false);assert.ok(Math.abs(inside.signedVolumes[0]+8)<1e-12);
  const badWinding=original.slice();[badWinding[0],badWinding[1]]=[badWinding[1],badWinding[0]];
  assert.ok(auditSidedness(position,badWinding).inconsistentEdges>0);
  const duplicate=Uint16Array.from([...original,...original.slice(0,3)]);
  assert.ok(auditSidedness(position,duplicate).nonManifoldEdges>0);
  const degenerate=Uint16Array.from([...original,0,0,1]);
  assert.equal(auditSidedness(position,degenerate).degenerateTriangles,1);
  for(const index of [original.slice(3),inverse,badWinding,duplicate,degenerate])assert.equal(auditSidedness(position,index).closedOutward,false);
});
test('positive aggregate volume cannot conceal an inverted disconnected component',()=>{
  const a=cube(),b=new THREE.BoxGeometry(1,1,1);b.translate(10,0,0);
  const positions=Float32Array.from([...a.attributes.position.array,...b.attributes.position.array]);
  const second=Array.from(b.index.array,v=>v+a.attributes.position.count);
  for(let i=0;i<second.length;i+=3)[second[i],second[i+1]]=[second[i+1],second[i]];
  const result=auditSidedness(positions,Uint16Array.from([...a.index.array,...second]));
  assert.equal(result.components,2);assert.equal(result.positiveComponents,1);
  assert.ok(result.signedVolumes.reduce((a,b)=>a+b,0)>0);assert.equal(result.closedOutward,false);
});
test('exact welding preserves small real gaps and rejects malformed inputs',()=>{
  const g=cube(),p=g.attributes.position.array.slice();p[0]+=.000001;
  assert.equal(auditSidedness(p,g.index.array).closedOutward,false);
  assert.equal(auditSidedness(new Float32Array(),new Uint16Array()).closedOutward,false);
  assert.throws(()=>auditSidedness([0,0],[0,0,0]),/Incomplete/);
  assert.throws(()=>auditSidedness([0,0,NaN],[0,0,0]),/Non-finite/);
  assert.throws(()=>auditSidedness([0,0,0],[0,0,1]),/Invalid index/);
});
