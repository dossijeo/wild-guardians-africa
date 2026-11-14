import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,PlaneGeometry,MeshBasicMaterial,DoubleSide} from 'three';
import {assertNativeTerrainPresentationSupport} from '../src/rendering/native-terrain-presentation-support.js';

function fixture(){
 const material=new MeshBasicMaterial({side:DoubleSide}),geometry=new PlaneGeometry(48,48);geometry.rotateX(-Math.PI/2);
 const old=new Mesh(geometry,material),same=new Mesh(geometry,material),changed=new Mesh(geometry,material);changed.position.y=3;
 const residency={get:()=>old},view={get:()=>same,changedKeys:new Set(['0,0'])};
 return {residency,view,changed,dispose(){material.dispose();geometry.dispose();}};
}

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
