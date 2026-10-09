import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {installCropFrustum} from './browser/crop-frustum.js';
import {loadCropBridges} from '../src/rendering/crop-library.js';
import {createCropBatch} from '../src/rendering/crop-batch.js';
import * as Game from '../src/simulation/game.js';
import {advancePlant,waterPlant} from '../src/simulation/crops.js';
import {cropSpec} from '../src/simulation/rules.js';
import {rational} from '../src/simulation/money.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';

const catalogue=JSON.parse(readFileSync('public/content/models.json'));
const source=catalogue.find(m=>m.source.includes('Cultivos'));
let data=JSON.parse(readFileSync('public/content/crop-bridges.json'));
const ids=['maiz','algodon','girasol','platano','sorgo','mijo','yuca','batata'];
const marks=[.065,.27,.53,.78,1];
// Node cannot decode the embedded images. Preserve every native accessor,
// index, classification and bridge datum; texture appearance needs WebGL QA.
async function loadCpuModel(url){
const buffer=readFileSync('public'+url),size=buffer.readUInt32LE(12);
const doc=JSON.parse(buffer.subarray(20,20+size));
for(const m of doc.materials??[]){
 delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;
 delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;
}
const json=Buffer.from(JSON.stringify(doc)),length=Math.ceil(json.length/4)*4;
const output=Buffer.alloc(buffer.length-size+length,32);
buffer.copy(output,0,0,20);output.writeUInt32LE(output.length,8);output.writeUInt32LE(length,12);
json.copy(output,20);buffer.copy(output,20+length,20+size);
return new GLTFLoader().parseAsync(output.buffer.slice(output.byteOffset,output.byteOffset+output.length),'');
}
const gltf=await loadCpuModel(source.url);
data=await loadCropBridges(data,loadCpuModel);
const originals=Array(40);gltf.scene.traverse(o=>{if(o.isMesh)originals[o.userData.cropIndex*5+o.userData.stage-1]=o;});
const renderer={capabilities:{getMaxAnisotropy:()=>1}};
const nav={placement:()=>({valid:true,suppress:[]}),setState:()=>{},terrainValid:()=>true,walkable:()=>true,path:(_start,end)=>[end]};
const ground=(x,z)=>.01*x-.02*z,origin={x:192,z:48};
function batch(){const scene=new THREE.Scene();return {scene,batch:createCropBatch(scene,renderer,gltf,data,1)};}
function saved(s){const values=new Map(),repo=new SaveRepository({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)});repo.save(s);return repo.load(s.slotId);}
function prepared(species,growth){
 const s=Game.newGame({seed:712,slotId:'native-'+species});Game.resume(s,'intro');s.ledger.balance=rational(10000);
 Game.placeStructure(s,'center',{x:4,z:0},nav);Game.plant(s,'seed',species,8,4,nav);
 s.day=101;s.completedNights=100;s.postgame=true;s.initialPreparation=false;s.tutorial.step='done';
 const p=s.plants[0];waterPlant(p);
 // Explicit attended preparation using the canonical checkpoint algorithm,
 // not a natural campaign or a test of worker animations/terrain placement.
 while(p.growth<growth-1e-9){while(waterPlant(p)){};const next=p.water.find(w=>w.status==='future');advancePlant(p,Math.min(growth-p.growth,next?next.at-p.growth:Infinity));}
 Game.rebuildTasks(s);return s;
}
function renderSnapshot(view,s){
 view.batch.update(s.plants.filter(p=>p.alive),s.elapsed,ground,origin);
 return view.scene.children.filter(m=>m.visible&&m.count).map(m=>({name:m.name,count:m.count,position:m.position.toArray(),matrix:Array.from(m.instanceMatrix.array.slice(0,m.count*16)),growth:Array.from((m.geometry.getAttribute('iBridge')??m.geometry.getAttribute('iGrowth')).array.slice(0,m.count*4))}));
}

test('QA-036: all 40 native originals and 32 opaque bridges preserve every indexed position, normal and UV corner',()=>{
 const view=batch();try{
  assert.equal(originals.filter(Boolean).length,40);assert.equal(view.scene.children.length,72);
  for(let i=0;i<40;i++){
   const native=originals[i],mesh=view.scene.getObjectByName(native.name);
   assert.equal(native.userData.cropIndex,Math.floor(i/5));assert.equal(native.userData.stage,i%5+1);
   assert.ok(native.geometry.index.count>100,'Use actual crop topology');
   for(const attr of ['position','normal','uv'])assert.deepEqual(mesh.geometry.getAttribute(attr).array,native.geometry.getAttribute(attr).array);
   assert.deepEqual(mesh.geometry.index.array,native.geometry.index.array);
  }
  for(const pair of data.pairs){
   const a=originals[pair.a],b=originals[pair.b],mesh=view.scene.getObjectByName(`puente_${a.userData.crop}_${a.userData.stage}_${b.userData.stage}`);
   assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.opacity,1);assert.equal(mesh.material.alphaTest,0);assert.equal(mesh.material.alphaHash,false);assert.equal(mesh.material.depthWrite,true);
   const baked=data.bakedTemplates.get(data.pairs.indexOf(pair));
   assert.deepEqual(mesh.geometry.index.array,baked.geometry.index.array);
   for(const [nativeName,runtimeName] of [['position','position'],['normal','normal'],['uv','uv'],['_aroot','aRoot'],['_apeerroot','aPeerRoot'],['_aspin','aSpin'],['_apart','aPart']])assert.deepEqual(mesh.geometry.getAttribute(runtimeName).array,baked.geometry.getAttribute(nativeName).array);
   assert.equal(mesh.material.side,THREE.FrontSide);
   assert.equal(mesh.material.shadowSide,THREE.FrontSide);
   assert.equal(mesh.customDepthMaterial.side,THREE.FrontSide);
   for(const name of ['aRoot','aPeerRoot','aSpin','aPart'])assert.ok(mesh.geometry.getAttribute(name).array.every(Number.isFinite));
   const shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'void main() { gl_FragColor=vec4(1.); }'};
   mesh.material.onBeforeCompile(shader);assert.equal(shader.fragmentShader,'void main() { gl_FragColor=vec4(1.); }');
   assert.ok(shader.vertexShader.includes('vec3 transformed=bridgePosition(position);'));
   assert.ok(mesh.customDepthMaterial.userData.worldDepthCompatible);
  }
 }finally{view.batch.dispose();}
});

for(const [crop,species] of ids.entries())test(`QA-035: ${species} reconstructs each native morph at 20/50/80 percent and continues without resetting`,()=>{
 const before=batch(),after=batch();try{
  for(let stage=0;stage<4;stage++)for(const fraction of [.2,.5,.8]){
   const duration=cropSpec(species).growth_seconds;
   const growth=(marks[stage]+.81*(marks[stage+1]-marks[stage]))*duration+(fraction-.5)*2;
   const s=prepared(species,growth),loaded=saved(s),sample=before.batch.sample(species,s.plants[0].growth);
   assert.equal(serialize(loaded),serialize(s));assert.equal(sample.phase,'morph');
   assert.equal(sample.from,stage);assert.equal(sample.to,stage+1);assert.equal(sample.bridge.index,crop*4+stage);
   assert.ok(Math.abs(sample.t-fraction)<1e-10);assert.ok(Math.abs(sample.seconds-2)<1e-10);
   assert.deepEqual(after.batch.sample(species,loaded.plants[0].growth),sample);
   assert.deepEqual(renderSnapshot(after,loaded),renderSnapshot(before,s));
   const active=renderSnapshot(before,s);assert.equal(active.length,1);assert.equal(active[0].count,1);
   assert.equal(active[0].name,`puente_${species}_${stage+1}_${stage+2}`);
   // Pausing retains geometry/progress; a real gameplay tick then advances both
   // worlds identically, including across the outgoing edge of the morph.
   Game.pause(s,'menu');Game.pause(loaded,'menu');Game.tick(s,.5,nav);Game.tick(loaded,.5,nav);
   assert.equal(s.plants[0].growth,growth);assert.deepEqual(renderSnapshot(after,loaded),active);
   Game.resume(s,'menu');Game.resume(loaded,'menu');
   for(let i=0;i<50;i++){Game.tick(s,.05,nav);Game.tick(loaded,.05,nav);assert.equal(serialize(loaded),serialize(s));assert.deepEqual(renderSnapshot(after,loaded),renderSnapshot(before,s));}
   assert.ok(s.plants[0].growth>growth);assert.equal(before.batch.sample(species,s.plants[0].growth).phase,'original');
  }
 }finally{before.batch.dispose();after.batch.dispose();}
});


test('experimental culling encloses every native original vertex across growth, rotation and wind extremes',()=>{
 const view=batch(),candidate=installCropFrustum(view.batch,view.scene,gltf),point=new THREE.Vector3(),matrix=new THREE.Matrix4();
 const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
 let checked=0;
 try{
  candidate.setEnabled(true);
  for(const species of ids)for(const ratio of [0,.03,.065,.12,.269,.27,.4,.529,.53,.65,.779,.78,.9,1]){
   const plant={id:'bounds-7',species,growth:ratio*cropSpec(species).growth_seconds,x:123.456,z:-321.123,rotation:1.7};
   view.batch.update([plant],5,()=>3.4,{x:96,z:-288});
   for(const item of candidate.items)if(item.mesh.count&&!item.metas){
    const {mesh,attr}=item,pg=mesh.geometry.attributes.position,sy=attr.array[0],sr=attr.array[1],folded=1-attr.array[2];mesh.getMatrixAt(0,matrix);
    for(let i=0;i<pg.count;i++)for(const wind of [-.026,.026]){
     const x=pg.getX(i),y=pg.getY(i),z=pg.getZ(i),above=Math.max(0,y-.1),pm=smooth(.1,.22,y),lm=pm*smooth(.035,.22,Math.hypot(x,z));
     point.set(x*(1+(sr-1)*pm)*(1-lm*folded*.16)+wind,y+above*(sy-1)*pm+lm*folded*(.1+above*.12),z*(1+(sr-1)*pm)*(1-lm*folded*.16)+wind*.47).applyMatrix4(matrix);
     assert.ok(mesh.boundingBox.containsPoint(point),species+'/'+ratio+'/'+mesh.name);checked++;
    }
   }
  }
  assert.ok(checked>100000,'Use the actual native topology');
 }finally{candidate.dispose();view.batch.dispose();}
});

test('experimental bounds follow membership and origin, reuse paused bounds, and leave logical plants unchanged',()=>{
 const view=batch(),candidate=installCropFrustum(view.batch,view.scene,gltf);
 try{
  const plants=[{id:'bounds-1',species:'maiz',growth:cropSpec('maiz').growth_seconds,x:100,z:200,rotation:2.3}];const before=JSON.stringify(plants);
  candidate.setEnabled(true);view.batch.update(plants,0,()=>3,{x:96,z:192});const mesh=candidate.items.find(i=>i.mesh.count).mesh;
  const sphere=mesh.boundingSphere.clone(),updates=candidate.updates;view.batch.update(plants,9,()=>3,{x:96,z:192});assert.equal(candidate.updates,updates);assert.deepEqual(mesh.boundingSphere,sphere);
  view.batch.update(plants,9,()=>3,{x:144,z:240});assert.notDeepEqual(mesh.boundingSphere,sphere);assert.ok(mesh.boundingBox.containsPoint(new THREE.Vector3(-44,3,-40)));
  const camera=new THREE.PerspectiveCamera(45,1,.1,10);camera.position.set(0,10,0);camera.lookAt(0,10,-1);camera.updateMatrixWorld();mesh.updateMatrixWorld();const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));assert.equal(frustum.intersectsObject(mesh),false);
  view.batch.update([],9,()=>3);assert.equal(mesh.count,0);assert.equal(mesh.visible,false);assert.equal(JSON.stringify(plants),before);candidate.setEnabled(false);assert.ok(candidate.items.every(i=>!i.mesh.frustumCulled));
 }finally{candidate.dispose();view.batch.dispose();}
});
