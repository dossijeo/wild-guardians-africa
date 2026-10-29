import test from 'node:test';import assert from 'node:assert/strict';
import {BoxGeometry,Mesh,MeshBasicMaterial,Float32BufferAttribute,Box3} from 'three';
import {sampleMeshSurfaceCrossings} from './browser/guardian-skin-crossings.js';
function box(size,x=0,y=0,z=0){const m=new Mesh(new BoxGeometry(size,size,size),new MeshBasicMaterial());m.position.set(x,y,z);m.updateMatrixWorld(true);return m;}
test('deformed surface diagnostic detects transverse overlap and retains bounded evidence',()=>{const r=sampleMeshSurfaceCrossings([box(2)],[box(2,.5,.3,.4)],3);assert.equal(r.points.length,3);assert.ok(r.limitReached);assert.ok(r.points.flat().every(Number.isFinite));});
test('disjoint boxes and face-touching boxes are not called transverse penetration',()=>{for(const x of [2,3])assert.equal(sampleMeshSurfaceCrossings([box(2)],[box(2,x)]).points.length,0);});
test('contained meshes explicitly remain outside the diagnostic claim',()=>{const r=sampleMeshSurfaceCrossings([box(3)],[box(1)]);assert.equal(r.points.length,0);assert.match(r.scope,/zero does not prove separation/);});

test('active morph deformation is sampled rather than the bind geometry',()=>{const a=box(2),b=box(2,3,.3,.4),n=b.geometry.attributes.position.count;const offsets=Array.from({length:n},()=>[-2,0,0]).flat();b.geometry.morphAttributes.position=[new Float32BufferAttribute(offsets,3)];b.geometry.morphTargetsRelative=true;b.updateMorphTargets();assert.equal(sampleMeshSurfaceCrossings([a],[b]).points.length,0);b.morphTargetInfluences[0]=1;assert.ok(sampleMeshSurfaceCrossings([a],[b]).points.length>0);});

test('restricting the BVH to the overlap volume retains transverse evidence',()=>{const a=box(2),b=box(2,.5,.3,.4),region=new Box3().setFromObject(a).intersect(new Box3().setFromObject(b));const full=sampleMeshSurfaceCrossings([a],[b],100),bounded=sampleMeshSurfaceCrossings([a],[b],100,region);const canonical=points=>points.map(p=>p.map(v=>v.toFixed(7)).join(',')).sort();assert.deepEqual(canonical(bounded.points),canonical(full.points));assert.ok(bounded.triangles[0]<=full.triangles[0]);});
