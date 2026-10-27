// Physics-only module. Inputs/outputs are numeric snapshots so the same solver
// can live in a worker without importing a renderer or touching game state.
export const RAGDOLL_LINKS=[
 ['Hips','Spine',-1,.18,'x',-.4,.4],
 ['Spine','Spine2',0,.19,'x',-.45,.45],
 ['Neck','Head',1,.10,'x',-.45,.45],
 ['Head','HeadTop_End',2,.19,'y',-.6,.6],
 ['LeftArm','LeftForeArm',1,.09,'z',-.9,.9],
 ['LeftForeArm','LeftHand',4,.07,'x',-.1,1.5],
 ['RightArm','RightForeArm',1,.09,'z',-.9,.9],
 ['RightForeArm','RightHand',6,.07,'x',-.1,1.5],
 ['LeftUpLeg','LeftLeg',0,.13,'z',-.55,.55],
 ['LeftLeg','LeftFoot',8,.09,'x',-1.6,.1],
 ['LeftFoot','LeftToeBase',9,.08,'x',-.45,.45],
 ['RightUpLeg','RightLeg',0,.13,'z',-.55,.55],
 ['RightLeg','RightFoot',11,.09,'x',-1.6,.1],
 ['RightFoot','RightToeBase',12,.08,'x',-.45,.45],
];
const vector=(x=0,y=0,z=0)=>({x,y,z});
const sub=(a,b)=>vector(a.x-b.x,a.y-b.y,a.z-b.z);
const length=a=>Math.hypot(a.x,a.y,a.z);
const inverse=q=>({x:-q.x,y:-q.y,z:-q.z,w:q.w});
function rotate(v,q){const x=2*(q.y*v.z-q.z*v.y),y=2*(q.z*v.x-q.x*v.z),z=2*(q.x*v.y-q.y*v.x);return vector(v.x+q.w*x+q.y*z-q.z*y,v.y+q.w*y+q.z*x-q.x*z,v.z+q.w*z+q.x*y-q.y*x);}
function multiply(a,b){return {x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z};}
function fromY(v){const n=length(v);if(n<1e-6)throw Error('Degenerate ragdoll segment');const y=v.y/n;if(y<-.99999)return {x:1,y:0,z:0,w:0};const q={x:v.z/n,y:0,z:-v.x/n,w:1+y},d=Math.hypot(q.x,q.z,q.w);return {x:q.x/d,y:0,z:q.z/d,w:q.w/d};}
const FRAMES={x:{x:0,y:0,z:0,w:1},y:{x:0,y:0,z:Math.SQRT1_2,w:Math.SQRT1_2},z:{x:0,y:-Math.SQRT1_2,z:0,w:Math.SQRT1_2}};
export const RAGDOLL_CONFIG=Object.freeze({capacity:3,step:1/60,launchSpeed:2.25,liftSpeed:1.65,settleSpeed:.28,settleSeconds:.25});
export class BeastRagdollSolver{
 constructor(R,{capacity=RAGDOLL_CONFIG.capacity,step=RAGDOLL_CONFIG.step,solverIterations=12}={}){
  if(!Number.isInteger(solverIterations)||solverIterations<1||solverIterations>32)throw Error('Invalid solver iterations');
  this.R=R;this.capacity=capacity;this.stepSize=step;this.world=new R.World(vector(0,-9.81,0));this.world.timestep=step;this.world.numSolverIterations=solverIterations;this.actors=new Map();this.obstacles=[];
  this.stats={active:0,stepMs:0,steps:0,rejected:0};
 }
 // Each scene supplies a local terrain patch and conservative solid volumes.
 // Static colliders are retained across steps; never rebuild them per frame.
 terrain(vertices,indices){const c=this.world.createCollider(this.R.ColliderDesc.trimesh(vertices,indices).setFriction(.85).setRestitution(.02).setCollisionGroups(0x00010002));this.obstacles.push(c);return c;}
 box(center,half,rotation={x:0,y:0,z:0,w:1}){const c=this.world.createCollider(this.R.ColliderDesc.cuboid(half.x,half.y,half.z).setTranslation(center.x,center.y,center.z).setRotation(rotation).setFriction(.8).setCollisionGroups(0x00010002));this.obstacles.push(c);return c;}
 add(id,{pose,colliders=null,scale=1,mass=1,direction=vector(1,0,0),velocity=vector(),intensity=1,heading=0}){
  if(this.actors.size>=this.capacity&&!this.actors.has(id)){this.stats.rejected++;return null;}
  // Validate the whole snapshot before allocating any WASM resources.
  for(const [a,b] of RAGDOLL_LINKS)for(const name of [a,b]){const p=pose[name];if(!p||![p.x,p.y,p.z].every(Number.isFinite))throw Error('Invalid ragdoll joint '+name);}
  for(const [a,b] of RAGDOLL_LINKS)if(length(sub(pose[b],pose[a]))<1e-5)throw Error('Degenerate ragdoll '+a);
  if(!(scale>0&&mass>0&&Number.isFinite(scale+mass+intensity+heading))||![direction.x,direction.y,direction.z,velocity.x,velocity.y,velocity.z].every(Number.isFinite))throw Error('Invalid ragdoll impulse');
  if(pose.parents&&(!Array.isArray(pose.parents)||pose.parents.length!==RAGDOLL_LINKS.length||pose.parents.some((p,i)=>!Number.isInteger(p)||p< -1||p>=i||(i>0&&p<0))))throw Error('Invalid ragdoll hierarchy');
  if(colliders)for(const fit of colliders)if(fit&&(!(fit.radius>0)||!(fit.halfHeight>=0)||![fit.radius,fit.halfHeight,fit.offset?.x,fit.offset?.y,fit.offset?.z].every(Number.isFinite)||(fit.hull&&(!Array.isArray(fit.hull)||fit.hull.length<12||fit.hull.length>288||fit.hull.length%3||!fit.hull.every(Number.isFinite)))))throw Error('Invalid ragdoll collider');
  if(this.actors.has(id))this.remove(id);
  const actor={parts:[],joints:[],age:0,quiet:0,settled:false,pose:new Float32Array(RAGDOLL_LINKS.length*7)};
  this.actors.set(id,actor);
  try{
   for(let i=0;i<RAGDOLL_LINKS.length;i++){
    const [a,b,defaultParent,r,axis,lo,hi]=RAGDOLL_LINKS[i],parent=pose.parents?.[i]??defaultParent,start=pose[a],end=pose[b],delta=sub(end,start),len=length(delta),q=fromY(delta),center=vector((start.x+end.x)/2,(start.y+end.y)/2,(start.z+end.z)/2);
    const fit=colliders?.[i],radius=fit?.radius??(i===3?r*scale:Math.min(r*scale,len*.45)),body=this.world.createRigidBody(this.R.RigidBodyDesc.dynamic().setTranslation(center.x,center.y,center.z).setRotation(q).setLinearDamping(.2).setAngularDamping(2.5).setCcdEnabled(true));
    actor.parts.push({body,center,rotation:q,length:len,radius});
    const offset=fit?.offset??vector();
    const shape=(fit?.hull?this.R.ColliderDesc.convexHull(new Float32Array(fit.hull)):null)??this.R.ColliderDesc.capsule(fit?.halfHeight??Math.max(.005,len/2-radius),radius).setTranslation(offset.x,offset.y,offset.z);
    this.world.createCollider(shape.setContactSkin(.05).setMass((i<2?8:2)*mass).setFriction(.8).setRestitution(.02).setCollisionGroups(0x00020001),body);
    if(parent>=0){
     const p=actor.parts[parent],a1=rotate(sub(start,p.center),inverse(p.rotation)),a2=rotate(sub(start,center),inverse(q));
     const yaw={x:0,y:Math.sin(heading/2),z:0,w:Math.cos(heading/2)},frame=multiply(yaw,FRAMES[axis]),f1=multiply(inverse(p.rotation),frame),f2=multiply(inverse(q),frame);
     const hinge=this.world.createImpulseJoint(this.R.JointData.revoluteWithAxes(a1,a2,rotate(vector(1,0,0),f1),rotate(vector(1,0,0),f2)),p.body,body,true);
     hinge.setLocalFrame1(a1,f1);hinge.setLocalFrame2(a2,f2);hinge.setLimits(lo,hi);hinge.setContactsEnabled(false);actor.joints.push(hinge);
    }
   }
   this.impulse(id,{direction,velocity,intensity,mass});this.snapshot(actor);this.stats.active=this.actors.size;return actor;
  }catch(error){this.remove(id);throw error;}
 }
 impulse(id,{direction,velocity=vector(),intensity=1,mass=1}){
  const a=this.actors.get(id);if(!a)return;
  const horizontal=Math.hypot(direction.x,direction.z)||1,power=Math.max(.2,Math.min(1.8,intensity))/Math.sqrt(Math.max(1,mass));
  // Common launch velocity preserves constraints. Small beasts travel roughly
  // 1â€“2m before ground friction; heavy species retain substantially more weight.
  const speed=RAGDOLL_CONFIG.launchSpeed*power,up=Math.max(.55,RAGDOLL_CONFIG.liftSpeed*power+Math.min(.4,Math.max(-.8,direction.y)));
  for(const {body} of a.parts){body.setLinvel(vector(direction.x/horizontal*speed+Math.max(-1,Math.min(1,velocity.x))*.3,up,direction.z/horizontal*speed+Math.max(-1,Math.min(1,velocity.z))*.3),true);}
  a.parts[0].body.applyTorqueImpulse(vector(direction.z*3*power,0,-direction.x*3*power),true);a.quiet=0;a.settled=false;
 }
 step(){
  if(!this.actors.size){this.stats.stepMs=0;return;}
  const t=performance.now();this.world.step();this.stats.steps++;
  for(const a of this.actors.values()){
   a.age+=this.stepSize;let speed=0;
   for(const {body} of a.parts){const v=body.linvel(),w=body.angvel();speed=Math.max(speed,length(v)+length(w)*.12);}
   a.quiet=speed<RAGDOLL_CONFIG.settleSpeed?a.quiet+this.stepSize:0;a.settled=a.age>.6&&a.quiet>RAGDOLL_CONFIG.settleSeconds;this.snapshot(a);
  }
  this.stats.stepMs=performance.now()-t;
 }
 snapshot(a){for(let i=0;i<a.parts.length;i++){const p=a.parts[i].body.translation(),q=a.parts[i].body.rotation(),j=i*7;a.pose[j]=p.x;a.pose[j+1]=p.y;a.pose[j+2]=p.z;a.pose[j+3]=q.x;a.pose[j+4]=q.y;a.pose[j+5]=q.z;a.pose[j+6]=q.w;}return a.pose;}
 remove(id){const a=this.actors.get(id);if(!a)return;for(const {body} of a.parts)this.world.removeRigidBody(body);this.actors.delete(id);this.stats.active=this.actors.size;}
 dispose(){this.world.free();this.actors.clear();this.obstacles.length=0;this.stats.active=0;}
}
