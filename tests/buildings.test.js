import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {prepareNativeBuilding,NativeBuilding,BuildingDestructionPass,centerVisualDamage} from '../src/rendering/buildings.js';
import {hitStructure} from '../src/simulation/rules.js';
import {numberOf} from '../src/simulation/money.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const catalogue=JSON.parse(readFileSync(new URL('../public/content/destruction.json',import.meta.url))).buildings;
function originalModel(building){
  const bytes=readFileSync(new URL('../public'+building.url,import.meta.url)),array=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),view=new DataView(array);let json,bin;
  for(let at=12;at<array.byteLength;){const n=view.getUint32(at,true),type=view.getUint32(at+4,true);if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(array,at+8,n)));if(type===0x004e4942)bin=at+8;at+=n+8;}
  const attr=id=>{const a=json.accessors[id],v=json.bufferViews[a.bufferView],Type=({5126:Float32Array,5125:Uint32Array,5123:Uint16Array})[a.componentType],size=({SCALAR:1,VEC2:2,VEC3:3})[a.type],out=new Type(a.count*size),offset=bin+(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??size*Type.BYTES_PER_ELEMENT;for(let i=0;i<a.count;i++)out.set(new Type(array,offset+i*stride,size),i*size);return new THREE.BufferAttribute(out,size);};
  const primitive=json.meshes[0].primitives[0],geometry=new THREE.BufferGeometry();
  for(const [name,key] of [['position','POSITION'],['normal','NORMAL'],['uv','TEXCOORD_0']])geometry.setAttribute(name,attr(primitive.attributes[key]));geometry.setIndex(attr(primitive.indices));
  const scene=new THREE.Group(),material=new THREE.MeshStandardMaterial({map:new THREE.Texture(),normalMap:new THREE.Texture(),roughnessMap:new THREE.Texture()});scene.add(new THREE.Mesh(geometry,material));return {scene,geometry,material};
}
function fakeRenderer(){
  return {size:new THREE.Vector2(1280,720),color:new THREE.Color('#abccdd'),alpha:.6,target:null,autoClear:false,shadowMap:{enabled:true},renders:0,
    getDrawingBufferSize(out){return out.copy(this.size)},getRenderTarget(){return this.target},setRenderTarget(target){this.target=target},getClearColor(out){return out.copy(this.color)},getClearAlpha(){return this.alpha},setClearColor(color,alpha){this.color.set(color);this.alpha=alpha},render(){this.renders++;if(this.fail)throw new Error('fallo GPU de prueba');}};
}
const models=catalogue.map(b=>originalModel(b)),templates=catalogue.map((b,i)=>prepareNativeBuilding(models[i],b));
test('Five native center templates retain original textures, proportions, UVs and world footprint',()=>{
  for(let i=0;i<templates.length;i++){
    const template=templates[i],original=models[i];assert.equal(template.material,original.material);
    assert.equal(template.body.getAttribute('aPos'),template.body.getAttribute('position'));assert.equal(template.body.getAttribute('aPos').count,template.kernel.indices.length);assert.equal(template.body.getAttribute('aUV').count,template.kernel.indices.length);
    assert.equal(template.body.index,null);assert.equal(template.noise.format,THREE.RedFormat);assert.equal(template.noise.wrapR,THREE.RepeatWrapping);
    assert.ok(template.kernel.hull.every(p=>Math.hypot(...p)*template.scale<=2.6+1e-9));assert.ok(Math.abs(Math.max(...template.kernel.hull.map(p=>Math.hypot(...p)))*template.scale-2.6)<1e-9);
    const source=original.geometry.getAttribute('position');assert.notEqual(source.array,template.kernel.positions);
    const box=new THREE.Box3().setFromBufferAttribute(source);assert.equal(box.max.y-box.min.y,template.kernel.bounds.max[1]-template.kernel.bounds.min[1]);
  }
});
test('Collapse displays all native 3.2 seconds after an oversized hit and restores intact on repair',()=>{
  const pass=new BuildingDestructionPass(fakeRenderer()),entity={id:'center',kind:'center',hp:600,maxHp:600,status:'intact',collapseRemaining:0},house=new NativeBuilding(templates[0],entity,pass);
  assert.equal(hitStructure(entity,600),true);assert.equal(entity.hp,0);assert.equal(house.scale.y,templates[0].scale);
  for(let i=0;i<=32;i++){entity.collapseRemaining=3.2-i*.1;house.update(entity,i*.1);assert.ok(Math.abs(house.damage-(.79+.21*i/32))<1e-12);assert.equal(house.scale.y,templates[0].scale);}
  entity.status='ruined';house.update(entity,3.2);assert.equal(house.damage,1);assert.equal(house.outer.visible,false);assert.equal(house.inner.visible,false);assert.equal(house.ash.visible,true);
  entity.status='intact';entity.hp=600;entity.collapseRemaining=0;house.update(entity,7);assert.equal(house.damage,0);assert.equal(house.outer.visible,true);assert.equal(house.inner.visible,false);assert.equal(house.ash.visible,false);assert.ok(house.uniforms.uHoles.value.every(v=>v.w===0));
  house.dispose();pass.dispose();
});
test('Separate houses keep independent damage masks, shader time and interior depth guard',()=>{
  const pass=new BuildingDestructionPass(fakeRenderer()),a={id:'a',hp:600,maxHp:600,status:'intact'},b={id:'b',hp:390,maxHp:600,status:'intact'},first=new NativeBuilding(templates[0],a,pass),second=new NativeBuilding(templates[0],b,pass);
  first.update(a,42);second.update(b,42);const before=JSON.stringify(second.uniforms.uHoles.value);first.update({...a,hp:120,status:'collapsing',collapseRemaining:2},42);
  assert.equal(JSON.stringify(second.uniforms.uHoles.value),before);assert.equal(second.uniforms.uDamage.value,.35);assert.equal(first.uniforms.uTime.value,42);
  assert.notEqual(first.uniforms.uHoles.value,second.uniforms.uHoles.value);assert.equal(first.inner.material.depthFunc,THREE.LessDepth);assert.equal(first.outer.material.transparent,false);assert.equal(first.inner.material.transparent,false);
  pass.quality=0;second.update(b,42);assert.equal(second.uniforms.uQuality.value,0);assert.equal(JSON.stringify(second.uniforms.uHoles.value),before);
  assert.equal(first.uniforms.uIntactDepth.value,pass.target.depthTexture);assert.equal(first.uniforms.uOpeningMask.value,pass.target.texture);assert.match(first.inner.material.fragmentShader,/texelFetch\(uOpeningMask,pixel,0\)/);
  assert.match(first.outer.customDepthMaterial.fragmentShader,/packDepthToRGBA\(gl_FragCoord.z\)/);assert.equal(first.outer.castShadow,true);
  first.dispose();second.dispose();pass.dispose();
});
test('Opening pass invalidates on damage, view, transform and resolution and restores renderer on failure',()=>{
  const renderer=fakeRenderer(),pass=new BuildingDestructionPass(renderer),camera=new THREE.PerspectiveCamera(42,1280/720,.1,100),entity={id:'center',hp:390,maxHp:600,status:'intact'},house=new NativeBuilding(templates[0],entity,pass);camera.position.set(0,5,10);camera.updateMatrixWorld();
  const color=renderer.color.clone(),target={previous:true};renderer.target=target;pass.render(camera);assert.equal(renderer.renders,1);assert.equal(renderer.target,target);assert.equal(renderer.autoClear,false);assert.equal(renderer.shadowMap.enabled,true);assert.equal(renderer.alpha,.6);assert.ok(renderer.color.equals(color));assert.equal(pass.target.width,1280);
  pass.render(camera);assert.equal(renderer.renders,1);house.update({...entity,hp:380},0);pass.render(camera);assert.equal(renderer.renders,2);
  house.position.x=2;pass.render(camera);assert.equal(renderer.renders,3);camera.position.x=1;pass.render(camera);assert.equal(renderer.renders,4);
  renderer.size.set(640,480);pass.render(camera);assert.equal(renderer.renders,5);assert.equal(pass.target.width,640);assert.equal(house.uniforms.uResolution.value.x,640);
  house.position.x=3;renderer.fail=true;assert.throws(()=>pass.render(camera),/fallo GPU/);assert.equal(renderer.target,target);assert.equal(renderer.autoClear,false);assert.equal(renderer.shadowMap.enabled,true);assert.equal(renderer.alpha,.6);assert.ok(renderer.color.equals(color));renderer.fail=false;pass.render(camera);assert.equal(renderer.renders,7);
  house.dispose();pass.dispose();
});
test('Original visual raycast tracks displaced houses and leaves ruins selectable for reconstruction',()=>{
  const pass=new BuildingDestructionPass(fakeRenderer());
  for(const template of templates){
    const entity={id:template.building.culture,hp:600,maxHp:600,status:'intact'},house=new NativeBuilding(template,entity,pass);house.position.set(10,2,4);house.rotation.y=.4;house.updateMatrixWorld(true);
    const raycaster=new THREE.Raycaster(new THREE.Vector3(10,20,4),new THREE.Vector3(0,-1,0),0,100),hits=[];house.raycastBody(raycaster,hits);assert.ok(hits.length>0,entity.id);assert.equal(hits[0].object,house.outer);assert.ok(hits[0].point.y>=2);assert.equal(template.kernel.damage,0);
    house.update({...entity,status:'ruined',hp:0},4);const ruined=raycaster.intersectObject(house,true);assert.ok(ruined.length>0,entity.id);assert.ok(ruined.every(hit=>hit.object===house.ash));
    house.dispose();
  }
  pass.dispose();
});
test('Removing a center disposes private materials while shared native templates remain reusable',()=>{
  const renderer=fakeRenderer(),pass=new BuildingDestructionPass(renderer),house=new NativeBuilding(templates[0],{id:'a',hp:600,maxHp:600,status:'intact'},pass);let privateDisposed=0,bodyDisposed=0,targetDisposed=0;
  for(const material of [house.outer.material,house.inner.material,house.ash.material,house.opening.material,house.outer.customDepthMaterial])material.addEventListener('dispose',()=>privateDisposed++);
  templates[0].body.addEventListener('dispose',()=>bodyDisposed++);pass.target.addEventListener('dispose',()=>targetDisposed++);house.dispose();assert.equal(privateDisposed,5);assert.equal(bodyDisposed,0);assert.equal(pass.buildings.size,0);assert.equal(pass.scene.children.length,0);pass.dispose();assert.equal(targetDisposed,1);
  assert.equal(centerVisualDamage({hp:300,maxHp:600,status:'intact'}),.5);
});
const nav={placement:()=>({valid:true,suppress:[]}),setState:()=>{},terrainValid:()=>true,walkable:()=>true,path:(start,end)=>[{x:end.x,z:end.z}]};
function paidGame(culture){const s=Game.newGame({culture,seed:712,slotId:'native-center-'+culture});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:4,z:0},nav);Game.plant(s,'seed','mijo',8,0,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});return s;}
test('Five paid centers clear their native damage only when the real rounded repair debit executes',()=>{
  for(const template of templates){
    const s=paidGame(template.building.culture),center=s.structures[0],pass=new BuildingDestructionPass(fakeRenderer()),house=new NativeBuilding(template,center,pass);
    assert.equal(numberOf(s.ledger.balance),95);hitStructure(center,40);house.update(center,s.elapsed);assert.ok(Math.abs(house.damage-40/600)<1e-12);
    Game.requestRepair(s,'repair',center.id);assert.equal(numberOf(s.ledger.balance),95);assert.equal(center.hp,560);
    for(let i=0;i<1000&&center.hp<600;i++){Game.tick(s,.1,nav);house.update(center,s.elapsed);if(!s.events.some(e=>e.type==='RepairApplied'))assert.ok(house.damage>0);}
    assert.equal(center.hp,600);assert.equal(house.damage,0);assert.equal(numberOf(s.ledger.balance),41);assert.equal(s.events.filter(e=>e.type==='RepairApplied').length,1);Game.tick(s,1,nav);assert.equal(numberOf(s.ledger.balance),41);
    house.dispose();pass.dispose();
  }
});
test('Real blocking pauses and a saved collapse retain identical native geometry phase and shader time',()=>{
  let state=paidGame('suajili');const pass=new BuildingDestructionPass(fakeRenderer()),house=new NativeBuilding(templates[0],state.structures[0],pass);hitStructure(state.structures[0],480);Game.tick(state,1.1,nav);house.update(state.structures[0],state.elapsed);
  const phase=house.damage,time=house.uniforms.uTime.value,holes=JSON.stringify(house.uniforms.uHoles.value);Game.pause(state,'qa');Game.tick(state,20,nav);house.update(state.structures[0],state.elapsed);assert.equal(house.damage,phase);assert.equal(house.uniforms.uTime.value,time);assert.equal(JSON.stringify(house.uniforms.uHoles.value),holes);
  state=deserialize(serialize(state));house.update(state.structures[0],state.elapsed);assert.equal(house.damage,phase);assert.equal(house.uniforms.uTime.value,time);assert.equal(JSON.stringify(house.uniforms.uHoles.value),holes);
  Game.resume(state,'qa');Game.tick(state,2.1,nav);house.update(state.structures[0],state.elapsed);assert.equal(state.structures[0].status,'ruined');assert.equal(house.damage,1);assert.equal(house.outer.visible,false);assert.equal(house.ash.visible,true);
  house.dispose();pass.dispose();
});
