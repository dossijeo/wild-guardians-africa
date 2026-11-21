import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PerspectiveCamera} from 'three';
import {guardianPlacement} from '../../src/rendering/guardian-placement.js';
const reference='8f903ec4e';
const source=execFileSync('git',['show',`${reference}:src/rendering/guardian-placement.js`],{encoding:'utf8'}).replace("from 'three'",`from '${import.meta.resolve('three')}'`);
const previous=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).guardianPlacement;
let seed=1729;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
let oldRays=0,newRays=0,changed=0,blocked=0;
for(let i=0;i<1000;i++){
 const camera=new PerspectiveCamera(30+random()*35,.6+random()*1.5,.1,500),angle=random()*Math.PI*2,distance=8+random()*30;
 camera.position.set(Math.sin(angle)*distance,5+random()*18,Math.cos(angle)*distance);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const allBlocked=i%5===0;blocked+=Number(allBlocked);
 const phase=random()*6,slope=(random()-.5)*.3;
 const args={camera,target:{x:(random()-.5)*12,z:(random()-.5)*12,radius:.5+random()*2},bodyScale:.7+random(),nav:{field:{surface:(x,z)=>x*slope},placement:(x,z)=>({valid:!allBlocked&&Math.sin(x+phase)+Math.cos(z)>.1})},state:{plants:[{alive:true,x:1,z:1}],workers:[{x:-2,z:1}],raid:{animals:[{x:3,z:-1,status:'attacking',radius:1}]}},occupied:(x,y,z)=>y<3&&Math.cos(x+phase)*Math.sin(z)>.4};
 const occlusion=(x,y,z)=>Math.sin(x*.7+phase)+Math.cos(z*.9)-y*.1>.7;
 const a=previous({...args,occluded:(...p)=>{oldRays++;return occlusion(...p);}});
 const b=guardianPlacement({...args,occluded:(...p)=>{newRays++;return occlusion(...p);}});
 try{assert.deepEqual(b,a);}catch(e){changed++;throw new Error(`Placement changed in scene ${i}: ${JSON.stringify({a,b})}`,{cause:e});}
}
const report={reference,seed:1729,scenes:1000,allGroundBlockedScenes:blocked,changed,oldRays,newRays,reduction:1-newRays/oldRays,scope:'Deterministic synthetic placement parity; not a graphical or frame-time benchmark.'};
writeFileSync('docs/guardian/phase2/orbit-during-cast/placement-pruning.json',JSON.stringify(report,null,2)+'\n');console.log(report);
