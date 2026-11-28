import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {clearBoxOffset} from '../src/rendering/clear-box-offset.js';
const box=(x,z,w=1)=>new Box3(new Vector3(x,0,z),new Vector3(x+w,2,z+w));
test('combined clearance escapes overlapping peers without bouncing between them',()=>{
 const body=box(0,0),solids=[box(-.4,-.4),box(.4,.4),box(-.4,.4)],shift=new Vector3();
 assert.ok(clearBoxOffset(body,solids,shift));const moved=body.clone().translate(shift);assert.ok(solids.every(s=>!moved.intersectsBox(s)));assert.ok(shift.length()<2);
});
test('clear poses and removed or vertically separate obstacles do not move',()=>{
 const body=box(0,0),gone=box(0,0);gone.active=()=>false;const high=box(0,0);high.translate(new Vector3(0,3,0));
 assert.deepEqual(clearBoxOffset(body,[gone,high,box(4,4)],new Vector3()).toArray(),[0,0,0]);
});

test('peer separation cannot jump through a thin static wall to a clear destination',()=>{
 const body=box(0,0),wall=new Box3(new Vector3(1.1,0,-10),new Vector3(1.2,3,10)),peer=new Box3(new Vector3(-3,0,-1),new Vector3(1,2,2)),shift=new Vector3();
 assert.ok(clearBoxOffset(body,[peer,wall],shift,.015,[wall]));
 assert.ok(body.max.x+shift.x<wall.min.x,'A clear destination beyond the wall is not a valid route');
 assert.ok(!body.clone().translate(shift).intersectsBox(peer));
});
