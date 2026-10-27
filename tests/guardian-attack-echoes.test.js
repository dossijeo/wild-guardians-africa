import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,CylinderGeometry,IcosahedronGeometry,TorusGeometry,Vector3} from 'three';
import {GuardianAttackEchoes} from '../src/rendering/guardian-attack-echoes.js';
function fixture(){const scene=new Scene(),geometry={beam:new CylinderGeometry(),core:new IcosahedronGeometry(),ring:new TorusGeometry()},pool=new GuardianAttackEchoes(scene,geometry);return {scene,geometry,pool,close(){pool.dispose();for(const g of Object.values(geometry))g.dispose();}};}
test('dense interruptions reuse a bounded pool and no more than three instanced draws',()=>{
 const f=fixture(),source=new Vector3(3,1,0),target=new Vector3(0,1,0),records=[...f.pool.records],buffers=f.pool.draws.map(m=>m.instanceMatrix);
 for(let i=0;i<30;i++){f.pool.retain(1+i*.001,source,target);f.pool.update(1.1);}
 assert.equal(f.pool.stats.active,8);assert.equal(f.pool.stats.evicted,22);assert.ok(records.every((record,i)=>record===f.pool.records[i]));assert.ok(buffers.every((buffer,i)=>buffer===f.pool.draws[i].instanceMatrix));assert.equal(f.scene.children.length,3);
 source.x=100;assert.equal(f.pool.records[0].source.x,3);f.pool.update(1.3);assert.equal(f.pool.meshes.ring.count,8);assert.ok(f.pool.draws.every(m=>m.count<=8));
 f.pool.update(2);assert.equal(f.pool.stats.active,0);assert.ok(f.pool.draws.every(m=>!m.visible));f.close();assert.equal(f.scene.children.length,0);
});
test('removal before contact cancels a projectile, while an existing contact flash may fade out',()=>{
 const f=fixture(),source=new Vector3(3,1,0),target=new Vector3(0,1,0);
 f.pool.retain(1,source,target,'removed');f.pool.update(1.1,()=>false);assert.equal(f.pool.stats.active,0);
 f.pool.retain(1,source,target,'hit');f.pool.update(1.3,()=>false);assert.equal(f.pool.meshes.ring.count,1);
 f.pool.clear();assert.equal(f.pool.stats.active,0);assert.ok(f.pool.draws.every(m=>m.count===0&&!m.visible));f.close();
});


test('disposing retained energy releases its resources without disposing borrowed geometry',()=>{
 const f=fixture();let geometryDisposals=0,materialDisposals=0;
 for(const geometry of Object.values(f.geometry))geometry.addEventListener('dispose',()=>geometryDisposals++);
 f.pool.material.addEventListener('dispose',()=>materialDisposals++);
 f.pool.retain(0,new Vector3(),new Vector3(1,0,0));f.pool.update(.3);
 f.pool.dispose();assert.equal(materialDisposals,1);assert.equal(geometryDisposals,0);
 assert.equal(f.scene.children.length,0);assert.equal(f.pool.stats.active,0);
 for(const geometry of Object.values(f.geometry))geometry.dispose();
 assert.equal(geometryDisposals,3);
});
