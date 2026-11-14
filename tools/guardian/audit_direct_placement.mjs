import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {PerspectiveCamera,Vector3} from 'three';
import {guardianPlacement} from '../../src/rendering/guardian-placement.js';
import {directGuardianPlacement} from '../../tests/fixtures/guardian-placement/direct.js';
let seed=1729;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296),scenes=[];
for(let i=0;i<400;i++){
 const camera=new PerspectiveCamera(30+rnd()*35,.6+rnd()*1.5,.1,500),angle=rnd()*Math.PI*2,distance=8+rnd()*30;
 camera.position.set(Math.sin(angle)*distance,5+rnd()*18,Math.cos(angle)*distance);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const phase=rnd()*6,slope=(rnd()-.5)*.3,allBlocked=i%5===0;
 scenes.push({camera,target:{x:(rnd()-.5)*12,z:(rnd()-.5)*12,radius:.5+rnd()*2},bodyScale:.7+rnd(),nav:{field:{surface:(x,z)=>x*slope},placement:(x,z)=>({valid:!allBlocked&&Math.sin(x+phase)+Math.cos(z)>.1})},state:{plants:[{alive:true,x:1,z:1}],workers:[{x:-2,z:1}],raid:{animals:[{x:3,z:-1,status:'attacking',radius:1}]}},occupied:(x,y,z)=>y<3&&Math.cos(x+phase)*Math.sin(z)>.4,occluded:(x,y,z)=>Math.sin(x*.7+phase)+Math.cos(z*.9)-y*.1>.7});
}
const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*p)];
function run(mode,measure=true){let rays=0,occupancy=0,placements=0,direct=0,changed=0,finiteErrors=0;const elapsed=[];
 for(const args of scenes){const q={...args,nav:{...args.nav,placement:(...x)=>{placements++;return args.nav.placement(...x)}},occupied:(...x)=>{occupancy++;return args.occupied(...x)},occluded:(...x)=>{rays++;return args.occluded(...x)}};
  const t=performance.now();const result=mode==='direct'?directGuardianPlacement(q):{position:guardianPlacement(q),direct:false};elapsed.push(performance.now()-t);direct+=+result.direct;const p=result.position;if(!Number.isFinite(p.x+p.y+p.z))finiteErrors++;if(measure&&mode==='direct'){const old=guardianPlacement(args);if(Math.hypot(old.x-p.x,old.y-p.y,old.z-p.z)>1e-8)changed++;if(result.direct){const v=new Vector3(p.x,p.y,p.z).project(args.camera);if(Math.abs(v.x)>.82||Math.abs(v.y)>.78)throw Error('Direct point outside frame');}}}
 return {mode,scenes:scenes.length,direct,changed,finiteErrors,rays,occupancy,placements,ms:{mean:elapsed.reduce((x,y)=>x+y,0)/elapsed.length,p95:percentile(elapsed,.95),p99:percentile(elapsed,.99),max:Math.max(...elapsed)}};
}
run('original',false);run('direct',false);
const runs=['original','direct','direct','original'].map(x=>run(x));if(runs.some(r=>r.finiteErrors))throw Error('Nonfinite result');
const report={seed:1729,scope:'Synthetic deterministic CPU microbenchmark; no Wild Engine, scene rendering, gameplay, real hardware GPU, graphical equivalence or allocation measurements. Candidate scans world arrays itself and falls back to original; different placements are intentional. Timing includes all synchronous operations in each placement, not construction of the real occluder index.',runs};
writeFileSync('docs/guardian/gpu-animation/guardian-direct-synthetic.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
