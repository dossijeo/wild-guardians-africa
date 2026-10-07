import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {WallStrokePreview} from '../src/rendering/wall-stroke-preview.js';
import {WorldScene} from '../src/rendering/scene.js';

test('wall guide retains ground heights, reprojects on camera movement and invalidates changed points/field',t=>{
 const previous={document:globalThis.document,ratio:globalThis.devicePixelRatio};
 t.after(()=>{if(previous.document===undefined)delete globalThis.document;else globalThis.document=previous.document;if(previous.ratio===undefined)delete globalThis.devicePixelRatio;else globalThis.devicePixelRatio=previous.ratio;});
 let clears=0,width=100;const moves=[],context=new Proxy({clearRect:()=>clears++,moveTo:(x,y)=>moves.push([x,y])},{get:(o,k)=>o[k]??(()=>{})});
 const overlay={style:{},setAttribute(){},getContext:()=>context,remove(){}};
 globalThis.document={createElement:()=>overlay};globalThis.devicePixelRatio=1;
 const preview=new WallStrokePreview({getBoundingClientRect:()=>({width,height:100}),parentElement:{append(){}}});
 const camera=new PerspectiveCamera(60,1,.1,100);camera.position.set(0,15,15);camera.lookAt(0,0,0);
 let calls=0;const field={surface:(x,z)=>{calls++;return x*.01+z*.01;}};
 preview.show([[0,0],[2,3]]);preview.render(camera,field);assert.equal(calls,6,'three terrain corners per uncached point');
 assert.equal(preview.terrainPoints[0].y,.075);assert.equal(preview.terrainPoints[1].y,.125);
 for(let i=0;i<60;i++)preview.render(camera,field);
 assert.equal(clears,1,'stationary guide must reuse its already drawn pixels');
 width=101;preview.render(camera,field);assert.equal(clears,2);
 globalThis.devicePixelRatio=2;preview.render(camera,field);assert.equal(clears,3);
 camera.fov=45;camera.updateProjectionMatrix();preview.render(camera,field);assert.equal(clears,4);
 const first=moves.at(-1);camera.position.x=2;preview.render(camera,field);
 assert.equal(calls,6);assert.notDeepEqual(moves.at(-1),first,'screen projection must follow camera');
 assert.equal(clears,5);
 preview.show([[0,0],[3,3]]);preview.render(camera,field);assert.equal(calls,9,'only the changed point resamples its triangle');
 assert.equal(preview.terrainPoints[1].y,.135);
 preview.render(camera,{surface:()=>{calls++;return 3;}});assert.equal(calls,15,'a changed field invalidates both points');
 assert(preview.terrainPoints.every(point=>point.y===3.075));
 preview.show([]);preview.render(camera,field);assert.equal(overlay.style.display,'none');
 preview.show([[0,0],[3,3]]);preview.render(camera,field);assert.equal(overlay.style.display,'block');assert.equal(clears,8,'reopening the guide must redraw it');
 preview.dispose();assert.equal(preview.terrainPoints.length,0);
});

test('wall picking touches only resident ground, while ordinary picks retain entity selection',()=>{
 const camera=new PerspectiveCamera(60,1,.1,100);camera.position.set(0,15,15);
 const ground={},entity={userData:{entityId:'house'}},intersections=[];
 const scene={camera,controls:{target:new Vector3()},nav:{field:{surface:()=>0}},canvas:{getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})},cursor:{set(){}},terrainMeshes:[ground],objects:new Map([['house',entity]]),state:{plants:[]},raycaster:{setFromCamera(){},intersectObjects:list=>{intersections.push(list);return list[0]===ground?[{point:{x:2,z:3}}]:[{object:entity,distance:1}];}}};
 const event={clientX:50,clientY:50};
 assert.deepEqual(WorldScene.prototype.pick.call(scene,event,{terrainOnly:true}),{entityId:null,point:{x:2,z:3}});
 assert.deepEqual(intersections,[[ground]]);
 intersections.length=0;
 assert.deepEqual(WorldScene.prototype.pick.call(scene,event),{entityId:'house',point:{x:2,z:3}});
 assert.deepEqual(intersections,[[entity],[ground]]);
});

test('screen-space guide follows the finger with no camera or terrain queries',t=>{
 const previous={document:globalThis.document,ratio:globalThis.devicePixelRatio};
 t.after(()=>{globalThis.document=previous.document;globalThis.devicePixelRatio=previous.ratio;});
 let paints=0;const moves=[],context=new Proxy({clearRect:()=>paints++,moveTo:(x,y)=>moves.push([x,y])},{get:(o,k)=>o[k]??(()=>{})});
 const overlay={style:{},setAttribute(){},getContext:()=>context,remove(){}};
 globalThis.document={createElement:()=>overlay};globalThis.devicePixelRatio=2;
 const preview=new WallStrokePreview({getBoundingClientRect:()=>({left:20,top:30,width:100,height:100}),parentElement:{append(){}}});
 const forbidden=new Proxy({},{get(){throw new Error('Screen guide queried terrain/camera');}});
 preview.showScreen([[30,45],[90,95]]);preview.render(forbidden,forbidden);
 assert.deepEqual(moves,[[10,15]]);assert.equal(paints,1);
 for(let i=0;i<60;i++)preview.render(forbidden,forbidden);assert.equal(paints,1);
 preview.showScreen([[30,45],[95,97]]);preview.render(forbidden,forbidden);assert.equal(paints,2);preview.dispose();
});
