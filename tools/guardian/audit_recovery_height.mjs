import fs from 'node:fs';
import {BeastRecovery} from '../../src/rendering/beast-recovery.js';
import {beastSkin} from '../../tests/helpers/beast-skin.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
import {BeastRagdollSolver} from '../../src/simulation/beast-ragdoll.js';
import R from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';
await R.init();
const report={scope:'Deterministic gravity-settled rigs on a flat plane; not a gameplay or performance test',species:[]};
for(const species of ['hyena','warthog','lion','buffalo','rhino']){
 const model=beastSkin(species),b=new BeastRagdollBinding(model);model.position.y=.15;model.updateMatrixWorld(true);const p=b.capture(),s=new BeastRagdollSolver(R);s.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});const a=s.add(species,{pose:p,colliders:b.colliders()});for(let i=0;i<480;i++)s.step();b.apply(a.pose);const fallen=b.entries[0].bone.getWorldPosition(new Vector3());b.restore();const standing=b.entries[0].bone.getWorldPosition(new Vector3());model.position.x+=fallen.x-standing.x;model.position.z+=fallen.z-standing.z;model.updateMatrixWorld(true);const r=new BeastRecovery(b,a.pose,{surface:()=>0}),rows=[];for(let i=0;i<=114;i++){r.restore();r.age=0;r.apply(i/60);const hip=b.entries[0].bone.getWorldPosition(new Vector3());let low={y:Infinity};for(const {mesh,index}of r.samples){const v=mesh.getVertexPosition(index,new Vector3()).applyMatrix4(mesh.matrixWorld);if(v.y<low.y){let k=0;for(let j=1;j<4;j++)if(mesh.geometry.attributes.skinWeight.getComponent(index,j)>mesh.geometry.attributes.skinWeight.getComponent(index,k))k=j;low={y:v.y,bone:mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getComponent(index,k)].name};}}rows.push({t:i/60,y:hip.y,lift:r.lift,lowestContact:low});}const brace=rows.filter(row=>row.t<=r.duration*.42);report.species.push({species,maxBraceCorrection:Math.max(...brace.map(row=>row.lift)),maxBracePelvis:Math.max(...brace.map(row=>row.y)),rows});s.dispose();
}

if(!process.argv[2])throw Error('Usage: node tools/guardian/audit_recovery_height.mjs report.json');
fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2));console.log(report.species.map(({species,maxBraceCorrection,maxBracePelvis})=>({species,maxBraceCorrection,maxBracePelvis})));
