import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3,Matrix4,Quaternion,Euler} from 'three';
import {guardianPropBounds} from '../src/rendering/guardian-prop-bounds.js';
test('passable foliage bounds match the rendered yaw and anisotropic scale',()=>{
 const asset={min:[-2,-.2,-1],max:[2,2,1]},prop={slot:5,x:12,y:3,z:-4,sx:1.5,sy:.8,sz:.6,yaw:.7};
 const matrix=new Matrix4().compose(new Vector3(prop.x,prop.y,prop.z),new Quaternion().setFromEuler(new Euler(0,prop.yaw,0)),new Vector3(prop.sx,prop.sy,prop.sz));
 const expected=new Box3(new Vector3(...asset.min),new Vector3(...asset.max)).applyMatrix4(matrix),actual=guardianPropBounds(prop,asset);
 for(let i=0;i<3;i++){assert.ok(Math.abs(actual.min[i]-expected.min.toArray()[i])<1e-12);assert.ok(Math.abs(actual.max[i]-expected.max.toArray()[i])<1e-12);}
});
test('tiny ground cover is excluded while scaled tall vegetation is retained',()=>{
 const asset={min:[-1,0,-1],max:[1,.2,1]},prop={x:0,z:0,scale:1};
 assert.equal(guardianPropBounds(prop,asset),null);assert.ok(guardianPropBounds({...prop,sy:4},asset));assert.equal(guardianPropBounds(prop,null),null);
});
