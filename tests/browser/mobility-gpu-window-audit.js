import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
try{
 const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#view'),antialias:false});renderer.setPixelRatio(1);renderer.setSize(512,512,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.BasicShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xb4bfce);const camera=new THREE.OrthographicCamera(-4,4,4,-4,.1,100);camera.position.set(5,7,9);camera.lookAt(0,0,0);scene.add(new THREE.AmbientLight(0xffffff,1.3));
 const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-4,8,3);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:30});light.shadow.bias=-.0005;scene.add(light,light.target);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.MeshStandardMaterial({color:0xc5bb9a}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const {scene:model}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/content/source/actors/warthog/expressive-candidate.glb');const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),factor=2.2/Math.max(size.x,size.y,size.z);model.scale.setScalar(factor);model.position.set(-center.x*factor,-bounds.min.y*factor,-center.z*factor);scene.add(model);
 const baseX=model.position.x,offset={value:0},meshes=[],seen=new Set();let mainDraws=0,shadowDraws=0;
 function inject(material){const previous=material.onBeforeCompile?.bind(material),key=material.customProgramCacheKey?.bind(material);material.onBeforeCompile=shader=>{previous?.(shader);shader.uniforms.uAuditOffset=offset;shader.vertexShader='uniform float uAuditOffset;\n'+shader.vertexShader;const marker='#include <project_vertex>';if(!shader.vertexShader.includes(marker))throw Error('Missing project vertex');shader.vertexShader=shader.vertexShader.replace(marker,`transformed+=inverse(mat3(modelMatrix))*vec3(uAuditOffset,0.0,0.0);\n${marker}`);};material.customProgramCacheKey=()=>`${key?.()??''}|culling-audit`;material.needsUpdate=true;}
 model.traverse(mesh=>{if(!mesh.isMesh)return;meshes.push(mesh);mesh.castShadow=true;mesh.onBeforeRender=()=>mainDraws++;mesh.onBeforeShadow=()=>shadowDraws++;for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(!seen.has(m)){seen.add(m);inject(m);}const m=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:m.map,alphaMap:m.alphaMap,alphaTest:m.alphaTest,side:m.shadowSide??m.side});inject(mesh.customDepthMaterial);});
 if(!meshes.length)throw Error('No animal meshes');const target=new THREE.WebGLRenderTarget(512,512),pixels=new Uint8Array(512*512*4);
 const render=()=>{scene.updateMatrixWorld(true);for(const mesh of meshes)if(mesh.isSkinnedMesh)mesh.skeleton.update();mainDraws=shadowDraws=0;renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,512,512,pixels);renderer.setRenderTarget(null);return {pixels:new Uint8Array(pixels),mainDraws,shadowDraws};};
 const diff=(a,b)=>{let changed=0,max=0;for(let i=0;i<a.length;i+=4){let d=0;for(let c=0;c<4;c++)d=Math.max(d,Math.abs(a[i+c]-b[i+c]));if(d)changed++;max=Math.max(max,d);}return {changed,max};};
 // Reference: CPU root at destination. The GPU route begins 20 world units away.
 model.position.x=baseX;offset.value=0;for(const m of meshes)m.frustumCulled=false;const cpu=render();model.position.x=baseX+20;offset.value=-20;const uncull=render();for(const m of meshes)m.frustumCulled=true;const naive=render();
 // Form a conservative local sphere for the entire straight route, retaining the current-pose base sphere.
 scene.updateMatrixWorld(true);const baseSpheres=[];
 for(const mesh of meshes){if(mesh.isSkinnedMesh)mesh.computeBoundingSphere();else{if(!mesh.geometry.boundingSphere)mesh.geometry.computeBoundingSphere();mesh.boundingSphere=mesh.geometry.boundingSphere.clone();}const sphere=mesh.boundingSphere.clone(),inverseLinear=new THREE.Matrix3().setFromMatrix4(mesh.matrixWorld).invert(),end=new THREE.Vector3(-20,0,0).applyMatrix3(inverseLinear);baseSpheres.push(sphere.clone());sphere.union(sphere.clone().translate(end));sphere.radius+=1e-4;mesh.boundingSphere.copy(sphere);}
 const swept=render();offset.value=0;const sweptOffscreen=render();for(const [i,mesh] of meshes.entries())mesh.boundingSphere.copy(baseSpheres[i]);const normalOffscreen=render();

 // Compare a full route sphere with five versioned 4-unit windows. The caller
 // installs the next window before it allows the shader to enter that window.
 const setBounds=(start,end)=>{for(const [i,mesh] of meshes.entries()){const inv=new THREE.Matrix3().setFromMatrix4(mesh.matrixWorld).invert(),base=baseSpheres[i],a=new THREE.Vector3(start,0,0).applyMatrix3(inv),b=new THREE.Vector3(end,0,0).applyMatrix3(inv),sphere=base.clone().translate(a);sphere.union(base.clone().translate(b));sphere.radius+=1e-4;mesh.boundingSphere.copy(sphere);}};
 const windows=[];
 for(let segment=0;segment<5;segment++){
  const start=-4*segment,end=-4*(segment+1),started=performance.now();setBounds(start,end);const preparationMs=performance.now()-started,samples=[];
  for(const displacement of [start,(start+end)/2,end]){
   offset.value=displacement;for(const mesh of meshes)mesh.frustumCulled=false;const reference=render();for(const mesh of meshes)mesh.frustumCulled=true;const bounded=render();const delta=diff(reference.pixels,bounded.pixels);
   setBounds(0,-20);const whole=render();setBounds(start,end);
   const wholeDelta=diff(reference.pixels,whole.pixels);
   if(delta.changed||wholeDelta.changed)throw Error('Route window differs from uncull reference: '+JSON.stringify({segment,displacement,delta,wholeDelta}));
   samples.push({displacement,mainDraws:bounded.mainDraws,shadowDraws:bounded.shadowDraws,wholeMainDraws:whole.mainDraws,wholeShadowDraws:whole.shadowDraws,diff:delta});
  }
  windows.push({start,end,preparationMs,samples});
 }
 // Demonstrate that publishing an offset outside the installed window is unsafe.
 setBounds(0,-4);offset.value=-20;const stale=render();for(const mesh of meshes)mesh.frustumCulled=false;const staleReference=render();const staleDiff=diff(staleReference.pixels,stale.pixels);if(staleDiff.changed<100)throw Error('Missing stale-window negative control');
 const result={windows,staleWindow:staleDiff,device:renderer.getContext().getParameter(renderer.getContext().getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL??renderer.getContext().RENDERER),meshCount:meshes.length,skinned:meshes.filter(m=>m.isSkinnedMesh).length,cpu:{mainDraws:cpu.mainDraws,shadowDraws:cpu.shadowDraws},uncull:{mainDraws:uncull.mainDraws,shadowDraws:uncull.shadowDraws,diff:diff(cpu.pixels,uncull.pixels)},naive:{mainDraws:naive.mainDraws,shadowDraws:naive.shadowDraws,diff:diff(cpu.pixels,naive.pixels)},swept:{mainDraws:swept.mainDraws,shadowDraws:swept.shadowDraws,diff:diff(cpu.pixels,swept.pixels)},sweptOffscreen:{mainDraws:sweptOffscreen.mainDraws,shadowDraws:sweptOffscreen.shadowDraws},normalOffscreen:{mainDraws:normalOffscreen.mainDraws,shadowDraws:normalOffscreen.shadowDraws,diff:diff(sweptOffscreen.pixels,normalOffscreen.pixels)},scope:'Static-pose warthog and directional shadow; five experimentally installed straight 4-unit windows and 15 samples. Results check against uncull rendering with synchronous pixel reads; preparation is diagnostic, not a benchmark. Not an authoritative safe horizon, animation envelope, temporal protocol or gameplay integration.'};
 if(!result.windows[0].samples.every(s=>s.mainDraws===0&&s.shadowDraws===0&&s.wholeMainDraws===4&&s.wholeShadowDraws===4))throw Error('Window culling control failed');
 if(result.naive.diff.changed<100||result.swept.diff.changed>20||result.swept.diff.max>4||result.uncull.diff.changed>20||result.uncull.diff.max>4||result.normalOffscreen.diff.changed||result.sweptOffscreen.mainDraws<=result.normalOffscreen.mainDraws)throw Error('Culling audit failed: '+JSON.stringify(result));window.mobilityGpuWindowAudit=result;target.dispose();renderer.dispose();
}catch(error){window.mobilityGpuWindowError=String(error?.stack??error);}
