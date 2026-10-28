import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AnimationMixer,Quaternion,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {rigForSampling} from '../tools/prepare_watering_emitters.mjs';
import {applyWorkerPose} from '../src/rendering/worker-actions.js';
const libraries=JSON.parse(fs.readFileSync('public/content/worker-actions.json'));
for(const [profile,library] of Object.entries(libraries))test(profile+': stationary recovery exit starts at Idle zero and blends to current Idle',async()=>{
 const g=await new GLTFLoader().parseAsync(rigForSampling(fs.readFileSync('public'+library.url)),'');
 const data={model:g.scene,mixer:new AnimationMixer(g.scene),clips:g.animations,name:null},worker={profile,status:'fleeing',running:false};
 const bones=[];g.scene.traverse(n=>{if(n.isBone)bones.push(n);});
 const snapshot=()=>{g.scene.updateMatrixWorld(true);return bones.map(n=>({p:n.getWorldPosition(new Vector3()),q:n.getWorldQuaternion(new Quaternion()).normalize()}));};
 const equal=(a,b)=>{for(let i=0;i<a.length;i++){assert.ok(a[i].p.distanceTo(b[i].p)<2e-5,bones[i].name+' position');assert.ok(a[i].q.angleTo(b[i].q)<2e-5,bones[i].name+' rotation');}};
 applyWorkerPose(data,worker,null,0,library);const start=snapshot();
 applyWorkerPose(data,worker,null,1.2,library);const destination=snapshot();
 assert.ok(start.some((v,i)=>v.p.distanceTo(destination[i].p)>1e-4),'test samples must differ');
 worker.recoveryExitRemaining=.24;applyWorkerPose(data,worker,null,1.2,library);equal(snapshot(),start);
 const blend=data.recoveryBlendAction;assert.notEqual(blend,data.action);
 worker.recoveryExitRemaining=.12;applyWorkerPose(data,worker,null,1.2,library);const middle=snapshot();
 assert.ok(middle.some((v,i)=>v.p.distanceTo(start[i].p)>1e-4));
 applyWorkerPose(data,worker,null,1.2,library);equal(snapshot(),middle);assert.equal(data.recoveryBlendAction,blend);
 worker.recoveryExitRemaining=0;applyWorkerPose(data,worker,null,1.2,library);equal(snapshot(),destination);assert.equal(blend.isScheduled(),false);
 // A later fall must not retain the cached recovery action's influence.
 worker.recoveryExitRemaining=.12;applyWorkerPose(data,worker,null,1.2,library);
 worker.fallRemaining=1;applyWorkerPose(data,worker,null,1.2,library);assert.equal(blend.isScheduled(),false);assert.equal(data.action.getEffectiveWeight(),1);
});
