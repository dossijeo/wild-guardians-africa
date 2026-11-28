// Controlled physics diagnostic, not a graphical or gameplay acceptance test.
import fs from 'node:fs';
import R from '@dimforge/rapier3d-compat';
import {beastSkin} from '../../tests/helpers/beast-skin.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
import {BeastRagdollSolver} from '../../src/simulation/beast-ragdoll.js';
import {ATTACK} from '../../src/simulation/guardian-combat.js';
await R.init();
const rows=[];
const center=a=>{
 const p={x:0,z:0};let mass=0;
 for(const {body} of a.parts){const m=body.mass(),c=body.worldCom();p.x+=c.x*m;p.z+=c.z*m;mass+=m;}
 return {x:p.x/mass,z:p.z/mass};
};
for(const species of ['hyena','warthog','lion','buffalo','rhino']){
 for(const [directionName,direction] of Object.entries({horizontal:{x:1,y:0,z:0},downward:{x:.6,y:-.8,z:0},lateral:{x:0,y:0,z:1}})){
  // A mass=1 counterfactual isolates mass on the identical rig/colliders.
  for(const mass of [...new Set([ATTACK.profiles[species].mass,1])]){
   const model=beastSkin(species),binding=new BeastRagdollBinding(model);
   const solver=new BeastRagdollSolver(R);
   solver.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});
   const a=solver.add(species,{pose:binding.capture(),colliders:binding.colliders(),mass,direction});
   const initial=center(a),hip={x:a.pose[0],z:a.pose[2]};
   let maxCom=0,maxHip=0,firstSettled=null;
   for(let frame=0;frame<360;frame++){
    solver.step();const c=center(a);
    maxCom=Math.max(maxCom,Math.hypot(c.x-initial.x,c.z-initial.z));
    maxHip=Math.max(maxHip,Math.hypot(a.pose[0]-hip.x,a.pose[2]-hip.z));
    if(a.settled&&firstSettled===null)firstSettled=(frame+1)/60;
    if(!a.pose.every(Number.isFinite))throw Error('Nonfinite pose: '+species);
   }
   const final=center(a);
   rows.push({species,direction:directionName,mass,maxCom,maxHip,finalCom:Math.hypot(final.x-initial.x,final.z-initial.z),firstSettled});
   solver.dispose();
   model.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
  }
 }
}
const report={method:'Actual rig bind poses, fitted colliders, flat floor, zero inherited velocity, intensity 1, 360 fixed steps at 60 Hz; no rolling or recovery controller.',rows};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.table(rows);
