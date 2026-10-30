// Compare installed skinned vertex positions with/without the secondary wind layer.
import * as T from 'three';
import {readFileSync,writeFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {rigForSampling} from '../prepare_watering_emitters.mjs';
import {GuardianSummons} from '../../src/rendering/guardian-summons.js';
const gltf=await new GLTFLoader().parseAsync(rigForSampling(readFileSync('public/content/guardian/guardian.glb')),'');
const make=()=>new GuardianSummons({toon:{uniforms:{uLightDir:{value:new T.Vector3(1,1,0)},uNight:{value:1}}},state:{events:[],elapsed:0,time:400},scene:new T.Scene(),assets:{model:async()=>gltf},vfxLibrary:{create:()=>Object.assign(new T.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}});
const actual=make(),reference=make();await Promise.all([actual.ready,reference.ready]);reference.slots[0].wind=[];
const mesh=s=>{let result;s.slots[0].model.traverse(o=>{if(o.name==='Guardian'&&o.isSkinnedMesh)result=o;});return result;},a=mesh(actual),b=mesh(reference);
const groups={cloth:[],feather:[],wood:[]},kinds=new Map(actual.slots[0].wind.map(w=>[w.bone.name,w.kind]));
for(let i=0;i<a.geometry.attributes.position.count;i++){
 const totals={cloth:0,feather:0,wood:0};for(let j=0;j<4;j++){const kind=kinds.get(a.skeleton.bones[a.geometry.attributes.skinIndex.getComponent(i,j)].name);if(kind)totals[kind]+=a.geometry.attributes.skinWeight.getComponent(i,j);}
 for(const kind in groups)if(totals[kind]>=.5)groups[kind].push(i);
}
const report={scope:'Installed mesh, world-space wind-only displacement relative to same authored pose. Vertex membership requires >=50% weight in each wind bone group. This is not collision, artistic or performance acceptance.',vertexGroups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length])),spells:{}};
const va=new T.Vector3(),vb=new T.Vector3();
try{
 for(const [n,kind] of ['growth','multiply','shield','attack'].entries()){
  const at=n*4;for(const s of [actual,reference]){s.clear();s.world.state.elapsed=at;s.world.state.events.push({type:'SpellActivated',kind,x:0,z:0,presentation:{origin:{x:3,y:1,z:0},contact:{x:0,y:1,z:0},elapsed:at}});s.update();}
  const stats=Object.fromEntries(Object.keys(groups).map(k=>[k,{max:0,sumSquares:0,count:0,peakAge:0,maxCombinedDistanceFromFirst:0}]));
  const firstPositions=new Map();
  for(let frame=1;frame<=65;frame++){
   const age=frame/30;for(const s of [actual,reference]){s.world.state.elapsed=at+age;s.update();s.world.scene.updateMatrixWorld(true);}a.skeleton.update();b.skeleton.update();
   for(const [group,indices] of Object.entries(groups))for(const i of indices){va.fromBufferAttribute(a.geometry.attributes.position,i);a.applyBoneTransform(i,va).applyMatrix4(a.matrixWorld);vb.fromBufferAttribute(b.geometry.attributes.position,i);b.applyBoneTransform(i,vb).applyMatrix4(b.matrixWorld);const distance=va.distanceTo(vb),st=stats[group];if(distance>st.max){st.max=distance;st.peakAge=age;}if(!firstPositions.has(i))firstPositions.set(i,va.clone());st.maxCombinedDistanceFromFirst=Math.max(st.maxCombinedDistanceFromFirst,va.distanceTo(firstPositions.get(i)));st.sumSquares+=distance*distance;st.count++;}
  }
  report.spells[kind]=Object.fromEntries(Object.entries(stats).map(([k,v])=>[k,{maxMetres:v.max,rmsMetres:Math.sqrt(v.sumSquares/v.count),peakAge:v.peakAge,samples:v.count,maxCombinedDistanceFromFirstMetres:v.maxCombinedDistanceFromFirst}]));
 }
}finally{actual.dispose();reference.dispose();}
writeFileSync('docs/guardian/phase2/pose-layer-fix/wind-vertex-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
