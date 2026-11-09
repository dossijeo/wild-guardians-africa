import * as THREE from 'three/webgpu';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createSpatialGateIntents} from '../../src/world/wild-engine/spatial-gate-intents.js';
import {NativeWall} from '../../src/rendering/walls.js';

export async function auditNativeGateMechanism(){
 const response=await fetch('/tests/fixtures/desierto983-d15-partial-state.json.gz'),bytes=new Uint8Array(await response.arrayBuffer()),
  text=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes),
  state=deserialize(text),template=structuredClone(state.workers[0]),module=await WebAssembly.compileStreaming(fetch('/src/world/wild-engine/spatial-savanna.wasm'));
 state.workers=[];state.tasks=[];state.plants=[];state.crates=[];state.spells=[];state.raid=null;state.elapsed=10;
 const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:chunk=>loaded.set(`${chunk.cx},${chunk.cz}`,chunk)}),
  canvas=document.createElement('canvas');canvas.width=960;canvas.height=480;document.body.append(canvas);
 const renderer=new THREE.WebGPURenderer({canvas,antialias:false}),walls=[],prototypes=[];
 let keep=false;
 try{
  await renderer.init();if(!renderer.backend.isWebGPUBackend)throw Error('This acceptance requires actual WebGPU');
  renderer.setSize(960,480,false);const device=renderer.backend.device;device.pushErrorScope('validation');
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  session.core.setSettlement(28,30,20,10);
  const materials=['zarzas','empalizada','reforzado'],entities=materials.map((material,i)=>({id:`structure-${990001+i}`,kind:'wall',gate:true,status:'intact',
   material,x:20+i*8,z:30,yaw:[0,.3,-.25][i],baseScaleX:i===1?1.15:1,hp:60,maxHp:60,gateOpen:0}));
  state.workers=entities.map((g,i)=>({...structuredClone(template),id:`worker-${900011+i}`,x:g.x,z:g.z-3,status:'returning',taskId:null,radius:.28,recovering:false,incapacitated:false}));
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(state);const gates=createSpatialGateIntents(session,state),w=session.core.wasm;
  for(const [i,g] of entities.entries()){
   if(!gates.register(g))throw Error('Native mechanism registration failed '+g.material);
   const result=gates.installMechanism(g.id,g.material);if(result.status!=='installed')throw Error('Native mechanism installation failed '+JSON.stringify({material:g.material,result}));
   const actor=state.workers[i];session.actorSectorRevision({worker:true});const ptr=w.nav_intent_attack_route_input_ptr(1);
   new Float32Array(w.memory.buffer,ptr,2).set([g.x,g.z+3]);
   if(w.nav_intent_restore_home(900011+i,actor.x,actor.z,g.x,g.z+3,1)!==1||w.spatial_body_upsert(i+1,actor.x,actor.z,.28,0,1)!==1||!gates.bindWorker(actor.id,i+1))
    throw Error('Native worker/controller binding failed');bridge.intentChanges();
  }
  if(gates.prepareMotion().status!=='prepared')throw Error('Native mechanism motor preflight failed');
  const pack=await(await fetch('/content/walls.json')).json(),array=async(descriptor,Type)=>{
   const url=new URL(descriptor.url,location.origin+'/'),response=await fetch(url);
   if(!response.ok||response.headers.get('content-type')?.includes('text/html'))throw Error('Expected authored binary asset '+url);
   const bytes=await response.arrayBuffer();if(bytes.byteLength%Type.BYTES_PER_ELEMENT)throw Error('Invalid authored binary alignment '+url);
   return new Type(bytes);
  },
   scene=new THREE.Scene();scene.background=new THREE.Color('#202d30');
  const camera=new THREE.PerspectiveCamera(42,2,.1,150),mechanisms=[];
  for(const [i,g] of entities.entries()){
   const p=pack.pieces[g.material+'_puerta'],source={p:await array(p.p,Float32Array),n:await array(p.n,Float32Array),uv:await array(p.uv,Float32Array),
    i:await array(p.i,Uint16Array),faceRegions:await array(p.faceRegions,Uint16Array),regions:p.regions,morph:{}},
    prototype=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:['#9caa63','#b98a57','#a3abb4'][i],side:THREE.DoubleSide}));
   prototype.userData.nativePiece=source;prototypes.push(prototype);
   const wall=new NativeWall({[g.material+'_puerta']:prototype},g,state.elapsed),mechanism=bridge.nativeGateMechanism(g.id);
   wall.bindNativeGateMechanism(mechanism);walls.push(wall);mechanisms.push(mechanism);scene.add(wall);
  }
  const y=mechanisms[0].baseY,ground=new THREE.Mesh(new THREE.PlaneGeometry(36,16),new THREE.MeshBasicMaterial({color:'#5f6951',side:THREE.DoubleSide}));
  ground.rotation.x=-Math.PI/2;ground.position.set(28,y-.025,30);scene.add(ground);camera.position.set(28,y+9,46);camera.lookAt(28,y+1,30);
  const phases=[];let maximumError=0;
  for(const fraction of [0,.2,.5,.8,1]){
   state.elapsed=10+.6*fraction;if(w.nav_intent_set_time(state.elapsed)!==1)throw Error('Native logical time rejected');const entries=[];
   for(const [i,g] of entities.entries()){
    const pose=bridge.nativeGateMechanismPose(g.id);walls[i].update({...g,gateOpen:1-fraction,nativeGatePose:pose},undefined,state.elapsed);walls[i].updateMatrixWorld(true);
    const native=bridge.nativeGateMechanismWorldVertices(g.id),positions=walls[i].parts[0].mesh.geometry.attributes.position.array,
     root=new THREE.Matrix4().fromArray(pose.rootMatrix);let maxError=0;
    for(let at=0;at<positions.length;at+=3){const p=new THREE.Vector3(positions[at],positions[at+1],positions[at+2]).applyMatrix4(root);
     maxError=Math.max(maxError,Math.abs(p.x-native[at]),Math.abs(p.y-native[at+1]),Math.abs(p.z-native[at+2]));}
    if(!Number.isFinite(maxError)||maxError>1e-5)throw Error('Native collision/render geometry diverged');maximumError=Math.max(maximumError,maxError);
    const a=new THREE.Vector3(.05,0,-2).applyMatrix4(root),b=new THREE.Vector3(.05,0,2).applyMatrix4(root),collision=bridge.nativeGateMechanismSegment(g.id,i+1,a,b);
    if(fraction===0&&collision.status!=='blocked'||fraction===1&&collision.status!=='clear')throw Error('Closed/open physical collision did not match '+g.material);
    entries.push({material:g.material,opening:pose.opening,baseY:pose.baseY,supportMin:pose.supportMin,supportMax:pose.supportMax,
     maxVertexError:maxError,collision,vertices:positions.length/3,mechanism:pose.mechanism});
   }
   await renderer.renderAsync(scene,camera);await device.queue.onSubmittedWorkDone();phases.push({at:state.elapsed,entries});
  }
  const error=await device.popErrorScope();if(error)throw Error('WebGPU validation error: '+error.message);
  const result={checklistId:'A6-04.e-R1',scope:'Three authored intact kinematic compound gates on validated flat native support. Actual NativeWall geometry rendered in WebGPU, native collision/root/hinge/support source, no ID exceptions. No future opening leases, character locomotion, runtime activation or causal-clock acceptance.',
   backend:'webgpu',adapter:{vendor:device.adapterInfo?.vendor??null,architecture:device.adapterInfo?.architecture??null,
    device:device.adapterInfo?.device??null,description:device.adapterInfo?.description??null},maximumError,phases,authorizedPassage:false,authorizedAutonomy:false};
  window.nativeGateMechanismView={renderer,scene,camera,walls,dispose(){for(const wall of walls)wall.dispose();for(const p of prototypes){p.geometry.dispose();p.material.dispose();}ground.geometry.dispose();ground.material.dispose();renderer.dispose();session.dispose();canvas.remove();}};
  keep=true;return result;
 }finally{if(!keep){for(const wall of walls)wall.dispose();for(const p of prototypes){p.geometry.dispose();p.material.dispose();}renderer.dispose();session.dispose();canvas.remove();}}
}
