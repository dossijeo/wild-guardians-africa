import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});
 await page.locator('#stress').evaluate(e=>e.click());await page.waitForFunction(()=>{const r=window.treeReview;return r.state.raid?.animals.length===20&&r.state.raid.animals.every(a=>r.world.mixers.has(a.id));},null,{timeout:120000});
 const report=await page.evaluate(async()=>{
  const r=window.treeReview;r.setManual(true);r.world.render(0);
  const [{Box3},{centerCulture},{captureStructureTemplate,createWorkerStructureObjects},{BeastPhysicsEnvironment},{BeastRagdollSolver},{BeastRagdollBinding},{beastPhysicsRuntime},{applyAnimalPose}]=await Promise.all([import('/node_modules/three/build/three.module.js'),import('/src/world/centers.js'),import('/src/simulation/worker-structure-geometry.js'),import('/src/rendering/beast-physics-environment.js'),import('/src/simulation/beast-ragdoll.js'),import('/src/rendering/beast-ragdoll-binding.js'),import('/src/rendering/beast-combat-physics.js'),import('/src/rendering/animal-actions.js')]);
  const animal=r.state.raid.animals.find(a=>a.species==='hyena'),center=r.state.structures.find(s=>s.kind==='center'&&s.status==='intact'),building=r.world.objects.get(center.id),root=r.world.objects.get(animal.id),rig=r.world.mixers.get(animal.id),box=new Box3().setFromObject(building);
  const original={x:animal.x,z:animal.z,heading:animal.heading};animal.x=box.max.x+.35;animal.z=(box.min.z+box.max.z)/2;animal.heading=-Math.PI/2;
  if(Math.hypot(animal.x-center.x,animal.z-center.z)>10)throw Error('Contact fixture is outside building admission radius');
  root.position.set(animal.x,r.nav.actorSurface(animal.x,animal.z),animal.z);root.rotation.y=animal.heading;applyAnimalPose(rig,animal,r.state.elapsed);root.updateMatrixWorld(true);
  const template=captureStructureTemplate(building),geometry=createWorkerStructureObjects(r.state,r.nav,{[centerCulture(center,r.state)]:template});geometry.sync(animal);
  const R=await beastPhysicsRuntime(),sceneSolver=new BeastRagdollSolver(R),workerSolver=new BeastRagdollSolver(R),sceneEnv=new BeastPhysicsEnvironment(r.world,sceneSolver),workerEnv=new BeastPhysicsEnvironment({state:r.state,nav:r.nav,objects:geometry.objects},workerSolver);
  try{
   sceneEnv.sync([animal]);workerEnv.sync([animal]);const key='structure:'+center.id,sceneCollider=sceneEnv.colliders.get(key),workerCollider=workerEnv.colliders.get(key);if(!sceneCollider||!workerCollider)throw Error('Missing building collider');
   const binding=new BeastRagdollBinding(rig.model),pose=binding.capture(),colliders=binding.colliders(),options={pose,colliders,scale:rig.model.scale.x,mass:1,direction:{x:-1,y:0,z:0},intensity:1.8,heading:animal.heading},a=sceneSolver.add(animal.id,options),b=workerSolver.add(animal.id,options);let maxPoseError=0,sceneContacts=0,workerContacts=0;
   const contacts=(solver,actor,obstacle)=>{let n=0;for(const part of actor.parts)solver.world.contactPair(part.body.collider(0),obstacle,manifold=>{if(manifold.numSolverContacts()>0)n++;});return n;};
   for(let i=0;i<240;i++){sceneSolver.step();workerSolver.step();sceneContacts+=contacts(sceneSolver,a,sceneCollider);workerContacts+=contacts(workerSolver,b,workerCollider);for(let j=0;j<a.pose.length;j++)maxPoseError=Math.max(maxPoseError,Math.abs(a.pose[j]-b.pose[j]));}
   if(!sceneContacts||!workerContacts)throw Error('Fixture did not generate a building contact');if(sceneContacts!==workerContacts||maxPoseError>1e-6)throw Error('Scene and worker geometry diverge: '+JSON.stringify({sceneContacts,workerContacts,maxPoseError}));
   return {biome:r.state.biome,culture:centerCulture(center,r.state),species:animal.species,steps:240,sceneContacts,workerContacts,maxPoseError,scope:'Identical real hyena rig and Rapier solver initialized once against production WorldScene building geometry and once against its reconstructed worker template. Confirms actual contacts and equal solver poses in this isolated fixture; both solvers execute on the main thread, without full game advance, recovery, other bodies or authoritative Worker messages.'};
  }finally{sceneSolver.dispose();workerSolver.dispose();geometry.dispose();Object.assign(animal,original);}
 });
 if(errors.length)throw Error(errors.join('\n'));await writeFile('docs/guardian/gpu-animation/worker-building-contact.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
