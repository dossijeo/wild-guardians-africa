import test from 'node:test';import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';import {animalFootprintConnector} from '../src/simulation/animal-footprint-connectors.js';
const rectangle=(x1,z1,x2,z2)=>[{x:x1,z:z1},{x:x2,z:z1},{x:x2,z:z2},{x:x1,z:z2}];
function world(){const n=new Navigation(712,'sabana',{});n.field={slope:()=>0,fluidInside:(x,z)=>x<-9||x>7.5||z<-8.5||z>8.5};n.propsAt=()=>[];n.version=1;n.obstacles=[{id:'center',kind:'center',footprint:rectangle(.32,-3,6,3)},{id:'house',kind:'house',footprint:rectangle(-10,-8,-1.86,0)}];return n;}
const actor=()=>({id:'retreat',status:'retreating',x:5.05,z:-6,radius:1}),end={x:5.05,z:6};
function finish(a,e,n){for(let i=0;i<2000;i++){const p=animalFootprintConnector(a,e,n);if(p)return p;}return null;}
test('footprint-derived corners route a full-radius animal through a physically open subcell passage',()=>{const n=world(),a=actor();assert.equal(n.path(a,end,a.radius,null,false),null,'The ordinary integer grid cannot represent this passage');const p=finish(a,end,n);assert(p);let previous=a;for(const q of p){assert(n.walkable(q.x,q.z,a.radius,null,false));assert(n.segmentClear(previous,q,a.radius,null,false));previous=q;}assert.deepEqual(p.at(-1),end);assert(p.some(p=>p.x>-.86&&p.x<-.68));});
test('native point and edge validation is capped at eight per recovery call',()=>{const n=world(),a=actor();let calls=0;const walk=n.walkable,segment=n.segmentClear;n.walkable=function(...args){calls++;return walk.apply(this,args);};n.segmentClear=function(...args){calls++;return segment.apply(this,args);};let p=null;for(let i=0;i<2000&&!p;i++){calls=0;p=animalFootprintConnector(a,end,n);assert(calls<=8);}assert(p);});
test('ordinary attacking or walking animals never use exit footprint recovery',()=>{for(const status of ['walking','attacking','entering']){const n=world();let calls=0;n.walkable=()=>{calls++;return true;};assert.equal(finish({...actor(),status},end,n),null);assert.equal(calls,0);}});
test('a genuinely narrower gap is rejected without reducing radius',()=>{const n=world();n.obstacles[1].footprint=rectangle(-10,-8,-1.6,0);assert.equal(finish(actor(),end,n),null);});
test('water, lava and steep surfaces remain authoritative on every proposed path',()=>{for(const mode of ['water','lava','steep']){const n=world();if(mode==='steep')n.field.slope=()=>.7;else n.field.fluidInside=()=>true;assert.equal(finish(actor(),end,n),null);}});
test('a failed attempt is not rebuilt every frame and retries after a new topology epoch',()=>{const n=world(),a=actor();let calls=0;const walk=n.walkable;n.walkable=function(...args){calls++;return walk.apply(this,args);};n.obstacles[1].footprint=rectangle(-10,-8,-1.6,0);assert.equal(finish(a,end,n),null);calls=0;for(let i=0;i<100;i++)assert.equal(animalFootprintConnector(a,end,n),null);assert.equal(calls,0);n.obstacles[1].footprint=rectangle(-10,-8,-1.86,0);n.version++;assert(finish(a,end,n));});
test('in-place selected footprint edits invalidate the failed geometry proof',()=>{const n=world(),a=actor();n.obstacles[1].footprint=rectangle(-10,-8,-1.6,0);assert.equal(finish(a,end,n),null);n.obstacles[1].footprint[1].x=-1.86;n.obstacles[1].footprint[2].x=-1.86;assert(finish(a,end,n));});

test('a wall ring introduced during recovery invalidates the pending proof and cannot be crossed',()=>{const n=world(),a=actor();assert.equal(animalFootprintConnector(a,end,n),null);const ring=[{x:5.05,z:-8,yaw:0},{x:5.05,z:-4,yaw:0},{x:3.05,z:-6,yaw:Math.PI/2},{x:7.05,z:-6,yaw:Math.PI/2}];n.obstacles.push(...ring.map((wall,i)=>({...wall,id:`wall${i}`,kind:'wall',baseScaleX:3})));assert(n.walkable(a.x,a.z,a.radius,null,false),'The origin itself stays valid');n.version++;assert.equal(finish(a,end,n),null);});

test('edited footprint recovery invalidates actual motion caches and its route remains traversable',()=>{
 const n=world(),a=actor(),epoch=n.version;
 n.obstacles[1].footprint=rectangle(-10,-8,-1.6,0);assert.equal(finish(a,end,n),null);
 n.obstacles[1].footprint[1].x=-1.86;n.obstacles[1].footprint[2].x=-1.86;
 const p=finish(a,end,n);assert(p);assert.equal(n.version,epoch+1);
 let previous=a;for(const q of p){assert(n.walkable(q.x,q.z,a.radius,null,false));assert(n.segmentClear(previous,q,a.radius,null,false));previous=q;}
});
