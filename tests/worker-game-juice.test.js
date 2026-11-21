import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera} from 'three';
import * as Game from '../src/simulation/game.js';
import {GameJuice} from '../src/ui/game-juice-runtime.js';
import {CameraTerrainUnavailable} from '../src/app/confirmed-camera-terrain.js';
import {workerPresentationGround} from '../src/app/worker-presentation-ground.js';

test('HUD effects work with a minimal Worker owner and wait for confirmed terrain',()=>{
 const saved={document:globalThis.document,matchMedia:globalThis.matchMedia,ResizeObserver:globalThis.ResizeObserver,Image:globalThis.Image};
 class Node{constructor(){this.style={};this.dataset={};this.classList={add(){},remove(){}};this.children=[];}append(node){this.children.push(node);}remove(){}setAttribute(){}querySelector(){return null;}getContext(){return {};}}
 globalThis.document={hidden:false,documentElement:{lang:'en'},createElement:()=>new Node()};globalThis.matchMedia=()=>({matches:false});globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.Image=class{async decode(){}};
 const stage=new Node();stage.clientWidth=800;stage.clientHeight=600;const camera=new PerspectiveCamera(45,4/3,.1,100);camera.position.set(0,4,10);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();let field=null;const owner={camera,quality:'media',cameraField:()=>field},state=Game.newGame({seed:712});let view;
 try{view=new GameJuice(stage,state,owner,{now:()=>0,surface:(x,z)=>workerPresentationGround(owner,x,z)});const effect=view.add('ring','',{x:0,z:0});view.update(state);assert.equal(effect.node.hidden,true);field={surface:()=>0};view.update(state);assert.equal(effect.node.hidden,false);field={surface:(x,z)=>{throw new CameraTerrainUnavailable(x,z);}};view.update(state);assert.equal(effect.node.hidden,true);field={surface:()=>{throw Error('unexpected terrain failure');}};assert.throws(()=>view.update(state),/unexpected terrain failure/);assert.equal(owner.nav,undefined);assert.equal(owner.renderer,undefined);}finally{view?.dispose();for(const [key,value] of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
