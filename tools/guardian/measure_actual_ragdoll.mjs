import fs from 'node:fs';
import R from '@dimforge/rapier3d-compat';
import {beastSkin} from '../../tests/helpers/beast-skin.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
import {BeastRagdollSolver,RAGDOLL_CONFIG} from '../../src/simulation/beast-ragdoll.js';
await R.init();
const center=a=>{let x=0,y=0,z=0,m=0;for(const {body} of a.parts){const p=body.worldCom(),w=body.mass();x+=p.x*w;y+=p.y*w;z+=p.z*w;m+=w;}return {x:x/m,y:y/m,z:z/m};};
const rows=[];
for(const [species,mass] of [['hyena',.7],['warthog',1],['lion',1.5],['buffalo',3],['rhino',5]]){
 const model=beastSkin(species),binding=new BeastRagdollBinding(model),pose=binding.capture(),colliders=binding.colliders();
 for(const [label,direction] of [['horizontal',{x:1,y:0,z:0}],['descending',{x:1,y:-.8,z:0}],['lateral',{x:0,y:0,z:1}]]){
  const solver=new BeastRagdollSolver(R);solver.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});
  const actor=solver.add(species,{pose,colliders,mass,direction}),initial=center(actor),hip=actor.pose.slice(0,3);
  let settledAt=null,peakRise=0,peakDistance=0;const times=[];
  for(let i=0;i<360;i++){solver.step();const c=center(actor);peakRise=Math.max(peakRise,c.y-initial.y);peakDistance=Math.max(peakDistance,Math.hypot(c.x-initial.x,c.z-initial.z));if(actor.settled&&settledAt===null)settledAt=(i+1)/60;times.push(solver.stats.stepMs);}
  const end=center(actor);times.sort((a,b)=>a-b);
  rows.push({species,mass,direction:label,centerTravel:Math.hypot(end.x-initial.x,end.z-initial.z),alongImpact:(end.x-initial.x)*direction.x+(end.z-initial.z)*direction.z,pelvisTravel:Math.hypot(actor.pose[0]-hip[0],actor.pose[2]-hip[2]),peakRise,peakDistance,settledAt,stepP95:times[Math.floor(times.length*.95)]});solver.dispose();
 }
 model.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
}
const report={scope:'Actual rest-pose rigs and fitted colliders on flat ground, 360 steps at 60 Hz. Mass-weighted rigid-body world centers. Not animated game poses, obstacle or graphical acceptance; CPU timings are Node-only.',config:RAGDOLL_CONFIG,rows};
if(!process.argv[2])throw Error('Output report path required');fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.table(rows);
