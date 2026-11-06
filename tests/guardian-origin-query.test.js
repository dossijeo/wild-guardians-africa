import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {freshNativeAuthorityOptions} from '../src/simulation/fresh-native-authority.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {queryGuardianOrigin,queryGuardianTutorialOrigin} from '../src/simulation/guardian-origin-query.js';
import {tutorialHandTarget} from '../src/tutorial/tutorial-hand-target.js';
const wasm=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));

test('QA origin query uses native authority without changing state and rejects an older boundary',async()=>{
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'guardian-origin'});let authority;
 try{const {state,nav,session}=opening,center=state.structures.find(item=>item.kind==='center'),opts=freshNativeAuthorityOptions({...state,elapsed:0,raid:null},nav,session,{eye:{x:center.x,z:center.z+38},target:center}),assets=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')).assets,cropHeights=JSON.parse(readFileSync('public/content/crop-stage-heights.json','utf8')).heights;authority=createSimulationAuthority(wasm,opts.snapshot,opts.chunkKeys,{navigationView:opts.navigationView});authority.setGuardianMetadata({assets,cropHeights});authority.setGuardianTerrainEpoch('s');const before=authority.execute({kind:'snapshot',sequence:1});
  const camera=new THREE.PerspectiveCamera(42,16/9,.1,500);camera.position.set(center.x+12,8,center.z+12);camera.lookAt(center.x,0,center.z);camera.updateMatrixWorld(true);const cameraData={position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.toArray(),near:camera.near,far:camera.far},matrix=new THREE.Matrix4().makeTranslation(center.x+200,0,center.z+200).toArray(),record=(id,kind)=>({id,kind,min:[-1,0,-1],max:[1,3,1],matrix}),records=[...state.villages.flatMap(v=>v.buildings.map((_,i)=>record(`v:${v.id}:${i}`,'village'))),...state.structures.filter(s=>s.kind==='center').map(s=>record(`s:${s.id}:center`,'center'))],publication={epoch:'s',sequence:1,revision:1,complete:true,records};
  const expected=queryGuardianOrigin({state,nav,sequence:1,epoch:'s',publication,camera:cameraData,assets,cropHeights,targetId:center.id});const result=authority.execute({kind:'qaGuardianOrigin',sequence:2,epoch:'s',publication,camera:cameraData,targetId:center.id});assert.deepEqual(result.value,expected);assert.equal(result.snapshot,before.snapshot);assert.deepEqual(result.events,[]);
  const stale=authority.execute({kind:'qaGuardianOrigin',sequence:3,epoch:'s',publication,camera:cameraData,targetId:center.id});assert.equal(stale.value,false);assert.match(stale.rejection,/stale/);assert.equal(stale.snapshot,before.snapshot);assert.deepEqual(stale.events,[]);
  authority.setGuardianTerrainEpoch('replacement');const oldEpoch=authority.execute({kind:'qaGuardianOrigin',sequence:4,epoch:'s',publication:{...publication,sequence:3},camera:cameraData,targetId:center.id});assert.equal(oldEpoch.value,false);assert.match(oldEpoch.rejection,/epoch.*stale/);assert.equal(oldEpoch.snapshot,before.snapshot);
 }finally{authority?.dispose();opening.dispose();}
});

test('tutorial guardian origin uses the authoritative target and rejects stale geometry',async()=>{
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'tutorial-origin'});let authority;
 try{const {state,nav,session}=opening;state.tutorial.step='plant';state.tutorial.basicSkipped=false;state.tutorial.dismissed=[];state.plants=[];
  const center=state.structures.find(item=>item.kind==='center'),opts=freshNativeAuthorityOptions(state,nav,session,{eye:{x:center.x,z:center.z+38},target:center}),assets=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')).assets,cropHeights=JSON.parse(readFileSync('public/content/crop-stage-heights.json','utf8')).heights;
  authority=createSimulationAuthority(wasm,opts.snapshot,opts.chunkKeys,{navigationView:opts.navigationView});authority.setGuardianMetadata({assets,cropHeights});authority.setGuardianTerrainEpoch('s');const before=authority.execute({kind:'snapshot',sequence:1});
  const config=tutorialHandTarget(state,nav,'plant');assert.ok(config);assert.equal(config.target,'plant-site');
  const camera=new THREE.PerspectiveCamera(42,16/9,.1,500);camera.position.set(center.x+12,15,center.z+18);camera.lookAt(center.x,0,center.z);camera.updateMatrixWorld(true);const cameraData={position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.toArray(),near:camera.near,far:camera.far},matrix=new THREE.Matrix4().makeTranslation(center.x+200,0,center.z+200).toArray(),record=(id,kind)=>({id,kind,min:[-1,0,-1],max:[1,3,1],matrix}),records=[...state.villages.flatMap(v=>v.buildings.map((_,i)=>record(`v:${v.id}:${i}`,'village'))),...state.structures.filter(s=>s.kind==='center').map(s=>record(`s:${s.id}:center`,'center'))],publication={epoch:'s',sequence:1,revision:1,complete:true,records},context={epoch:'s',publication,camera:cameraData};
  const expected=queryGuardianTutorialOrigin({state,nav,sequence:1,epoch:'s',publication,camera:cameraData,assets,cropHeights},config),result=authority.execute({kind:'tutorialGuideTarget',sequence:2,toolKind:'plant',toolSpell:null,guardianContext:context,targetPoint:{x:1e6,z:1e6}});assert.deepEqual(result.value,{...config,origin:expected});assert.equal(result.snapshot,before.snapshot);assert.deepEqual(result.events,[]);
  const stale=authority.execute({kind:'tutorialGuideTarget',sequence:3,toolKind:'plant',toolSpell:null,guardianContext:context});assert.equal(stale.value,null);assert.match(stale.rejection,/stale/);
  const unrelated=authority.execute({kind:'tutorialGuideTarget',sequence:4,toolKind:'center',toolSpell:null,guardianContext:{...context,publication:{...publication,sequence:3}}});assert.equal(unrelated.value,null);assert.equal(unrelated.rejection,undefined);
  authority.setGuardianTerrainEpoch('replacement');const oldEpoch=authority.execute({kind:'tutorialGuideTarget',sequence:5,toolKind:'plant',toolSpell:null,guardianContext:{...context,publication:{...publication,sequence:4}}});assert.equal(oldEpoch.value,null);assert.match(oldEpoch.rejection,/epoch.*stale/);
 }finally{authority?.dispose();opening.dispose();}
});
