import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FARM_ACTIONS} from '../src/audio/farm-actions-data.js';
import {calibrateFarmActions,inverseSmoothstep} from '../tools/calibrate_farm_actions.mjs';
import {geometryOnly} from '../tools/calibrate_footsteps.mjs';
import {applyWorkerPose} from '../src/rendering/worker-actions.js';
import {PROFILES} from '../src/simulation/workforce.js';
const libraries=JSON.parse(readFileSync(new URL('../public/content/worker-actions.json',import.meta.url),'utf8'));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('farm contact calibration regenerates exactly from all four original source scripts and GLB hashes',()=>{
 assert.deepEqual(calibrateFarmActions(),FARM_ACTIONS);assert.deepEqual(JSON.parse(readFileSync(new URL('../content/manifests/farm-actions.json',import.meta.url),'utf8')),FARM_ACTIONS);
});
for(const [profile,source] of Object.entries(FARM_ACTIONS.sources))test(profile+' authored phase gates and native prop visibility support sow/pick/pour, not an initial hoe',async()=>{
 const {markers:m,fractions:f,waterGate:g,durations:d}=source;assert.equal(source.initialTool,'hands');assert.equal(source.hoeDuringPlant,false);assert.equal(libraries[profile].actions.Plant.defaultAccessory,'none');
 close(m.sowStart,.28*d.Plant);close(m.seedDrop,.32*d.Plant);close(m.harvestContact,.44*d.Harvest);assert.ok(m.sowStart<m.seedDrop&&m.seedDrop<d.Plant);assert.ok(m.pourStart<m.pourEnd&&m.pourEnd<d.Water);
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);},flow=p=>smooth(g.riseStart,g.riseEnd,p)*(1-smooth(g.fallStart,g.fallEnd,p));
 close(flow(f.pourStart),g.threshold);close(flow(f.pourEnd),g.threshold);assert.ok(flow(f.pourStart-1e-6)<g.threshold&&flow(f.pourStart+1e-6)>g.threshold);assert.ok(flow(f.pourEnd-1e-6)>g.threshold&&flow(f.pourEnd+1e-6)<g.threshold);
 const gltf=await new GLTFLoader().parseAsync(geometryOnly(readFileSync(new URL('../public'+source.url,import.meta.url))),''),data={mixer:new THREE.AnimationMixer(gltf.scene),clips:gltf.animations,name:null},speed=PROFILES.find(p=>p.id===profile).speed;
 for(const progress of [m.sowStart,m.seedDrop]){
  const pose=applyWorkerPose(data,{profile,status:'acting',actionRemaining:(7.2-progress)/speed},{kind:'initial'},0,libraries[profile]);assert.equal(pose.name,'Plant');close(pose.time,progress);assert.ok(gltf.scene.getObjectByName('Prop_Hoe').scale.length()<.001);assert.ok(gltf.scene.getObjectByName('Prop_WateringCan').scale.length()<.001);
 }
 const pose=applyWorkerPose(data,{profile,status:'acting',actionRemaining:(3.4-m.pourStart/d.Water*3.4)/speed},{kind:'water'},0,libraries[profile]);assert.equal(pose.name,'Water');close(pose.time,m.pourStart);assert.ok(gltf.scene.getObjectByName('Prop_WateringCan').scale.length()>1);assert.ok(gltf.scene.getObjectByName('Prop_Hoe').scale.length()<.001);data.mixer.stopAllAction();data.mixer.uncacheRoot(gltf.scene);
});
test('the threshold inverse is finite and monotonic at both endpoints and the authored water gate',()=>{
 let previous=-1;for(const value of [0,.1,.45,.5,.9,1]){const t=inverseSmoothstep(value);assert.ok(Number.isFinite(t)&&t>=0&&t<=1&&t>previous);close(t*t*(3-2*t),value);previous=t;}
});
