import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,PlaneGeometry,MeshBasicMaterial,DoubleSide,Scene,Group} from 'three';
import {assertNativeTerrainPresentationSupport} from '../src/rendering/native-terrain-presentation-support.js';
import {createPreparedTerrainPlacement} from '../src/rendering/webgpu-terrain-placement.js';

function fixture(){
 const material=new MeshBasicMaterial({side:DoubleSide}),geometry=new PlaneGeometry(48,48);geometry.rotateX(-Math.PI/2);
 const old=new Mesh(geometry,material),same=new Mesh(geometry,material),changed=new Mesh(geometry,material);changed.position.y=3;
 const residency={get:()=>old},view={get:()=>same,changedKeys:new Set(['0,0'])};
 return {residency,view,changed,dispose(){material.dispose();geometry.dispose();}};
}

test('only the prepared original entity and exact support transition cover an otherwise rejected placement',()=>{
 const f=fixture(),scene=new Scene(),object=new Group(),entity={id:'original',x:0,z:0};scene.add(object);const state={crates:[entity]};f.view.get=()=>f.changed;
 try{const part=createPreparedTerrainPlacement({object,entity,previousHeight:0,nextHeight:3,isCurrent:()=>true});assert.doesNotThrow(()=>assertNativeTerrainPresentationSupport({state,...f,participants:[part]}));
  for(const claim of [{...part.terrainSupport,entity:{...entity}},{...part.terrainSupport,nextHeight:4}])assert.throws(()=>assertNativeTerrainPresentationSupport({state,...f,participants:[{valid:()=>true,terrainSupport:claim}]}),/prepared support/);
  part.cancel();assert.throws(()=>assertNativeTerrainPresentationSupport({state,...f,participants:[part]}),/prepared support/);
 }finally{f.dispose();}
});

for(const category of ['workers','plants','structures','crates','animals'])test(`a changed support under ${category} requires its prepared owner before physical effect`,()=>{
 const f=fixture(),entity={id:'original',x:0,z:0},state=category==='animals'?{raid:{animals:[entity]}}:{[category]:[entity]};try{
  assert.doesNotThrow(()=>assertNativeTerrainPresentationSupport({state,...f}));
  f.view.get=()=>f.changed;assert.throws(()=>assertNativeTerrainPresentationSupport({state,...f}),/prepared support.*original/);
  f.view.get=()=>null;assert.throws(()=>assertNativeTerrainPresentationSupport({state,...f}),/prepared support/);
 }finally{f.dispose();}
});

test('newly resident support is also rejected for an unprepared entity; unaffected chunks and carried crates remain covered',()=>{
 const f=fixture();try{
  f.residency.get=()=>null;assert.throws(()=>assertNativeTerrainPresentationSupport({state:{workers:[{id:'new-support',x:0,z:0}]},...f}),/new-support/);
  f.view.get=()=>f.changed;assert.doesNotThrow(()=>assertNativeTerrainPresentationSupport({state:{workers:[{id:'outside',x:80,z:80}],crates:[{id:'carried',carrierId:'outside',x:0,z:0}]},...f}));
 }finally{f.dispose();}
});

test('harvest provenance and delivered crate history do not require placements for objects no longer rendered',()=>{
 const f=fixture();try{f.view.get=()=>f.changed;assert.doesNotThrow(()=>assertNativeTerrainPresentationSupport({state:{plants:[{id:'harvested',alive:false,x:0,z:0}],crates:[{id:'delivered',delivered:true,x:0,z:0}]},...f}));}finally{f.dispose();}
});
