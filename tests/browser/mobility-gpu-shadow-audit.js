import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

try {
 const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#view'),antialias:false,preserveDrawingBuffer:true});
 renderer.setSize(512,512,false);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.BasicShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xb4bfce);
 const camera=new THREE.OrthographicCamera(-4,4,4,-4,.1,40);camera.position.set(5,7,9);camera.lookAt(0,0,0);
 scene.add(new THREE.AmbientLight(0xffffff,1.3));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-4,8,3);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:30});light.shadow.bias=-.0005;light.target.position.set(0,0,0);scene.add(light,light.target);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.MeshStandardMaterial({color:0xc5bb9a,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/content/source/actors/warthog/expressive-candidate.glb'),model=gltf.scene;
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),factor=2.2/Math.max(size.x,size.y,size.z);
 model.scale.setScalar(factor);model.position.set(-center.x*factor,-bounds.min.y*factor,-center.z*factor);scene.add(model);
 const baseX=model.position.x,offset={value:0},mode={value:0};let meshCount=0,compiled=0;
 function inject(material,kind){
  const previous=material.onBeforeCompile?.bind(material),key=material.customProgramCacheKey?.bind(material);
  material.onBeforeCompile=shader=>{previous?.(shader);shader.uniforms.uAuditOffset=offset;shader.uniforms.uAuditMode=mode;shader.vertexShader='uniform float uAuditOffset;\nuniform float uAuditMode;\n'+shader.vertexShader;
   const marker='#include <project_vertex>';if(!shader.vertexShader.includes(marker))throw Error('Projection chunk missing');
   const code=`if(uAuditMode>0.5){transformed+=inverse(mat3(modelMatrix))*vec3(uAuditOffset,0.0,0.0); }\n${marker}`;
   shader.vertexShader=shader.vertexShader.replace(marker,code);compiled++;};
  material.customProgramCacheKey=()=>`${key?.()??''}|gpu-shadow-${kind}`;material.needsUpdate=true;
 }
 // The same material can be shared by meshes; install only once.
 const seen=new Set(),depths=[];
 model.traverse(object=>{if(!object.isMesh)return;meshCount++;object.castShadow=true;object.frustumCulled=false;
  for(const material of Array.isArray(object.material)?object.material:[object.material])if(!seen.has(material)){seen.add(material);inject(material,'correct');}
  const original=Array.isArray(object.material)?object.material[0]:object.material;
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:original.map,alphaMap:original.alphaMap,alphaTest:original.alphaTest,side:original.shadowSide??original.side});inject(depth,'correct');object.customDepthMaterial=depth;depths.push(depth);
 });
 if(!meshCount)throw Error('No animal meshes');
 const target=new THREE.WebGLRenderTarget(512,512),pixels=new Uint8Array(512*512*4),snapshot=()=>{scene.updateMatrixWorld(true);model.traverse(object=>{if(object.isSkinnedMesh)object.skeleton.update();});renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,512,512,pixels);renderer.setRenderTarget(null);return new Uint8Array(pixels);};
 const diff=(a,b)=>{let changed=0,max=0,sum=0;for(let i=0;i<a.length;i+=4){let p=0;for(let c=0;c<4;c++){const d=Math.abs(a[i+c]-b[i+c]);p=Math.max(p,d);sum+=d;}if(p)changed++;max=Math.max(max,p);}return {changed,max,sum};};
 const move=1.0;
 model.position.x=baseX;offset.value=0;mode.value=0;const initial=snapshot();
 model.position.x=baseX+move;const cpu=snapshot(),cpuRepeat=snapshot();
 model.position.x=baseX;offset.value=move;mode.value=1;const gpu=snapshot(),gpuRepeat=snapshot();
 model.traverse(object=>{if(object.isMesh)object.castShadow=false;});model.position.x=baseX+move;offset.value=0;mode.value=0;const cpuNoShadow=snapshot();model.position.x=baseX;offset.value=move;mode.value=1;const gpuNoShadow=snapshot();model.traverse(object=>{if(object.isMesh)object.castShadow=true;});
 // Reuse the colour offset but disable the custom depth transform to reproduce the missing shadow pass.
 for(const depth of depths){depth.onBeforeCompile=shader=>{shader.uniforms.uAuditOffset=offset;shader.uniforms.uAuditMode={value:0};shader.vertexShader='uniform float uAuditOffset;\nuniform float uAuditMode;\n'+shader.vertexShader;};depth.customProgramCacheKey=()=> 'gpu-shadow-no-depth';depth.needsUpdate=true;}
 const broken=snapshot();
 const result={device:renderer.getContext().getParameter(renderer.getContext().getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL??renderer.getContext().RENDERER),meshCount,compiled,initialToCpu:diff(initial,cpu),cpuRepeat:diff(cpu,cpuRepeat),cpuToGpu:diff(cpu,gpu),gpuRepeat:diff(gpu,gpuRepeat),cpuToMissingDepth:diff(cpu,broken),cpuToGpuNoShadow:diff(cpuNoShadow,gpuNoShadow),initialToCpuNoShadow:diff(initial,cpuNoShadow),initialToGpuNoShadow:diff(initial,gpuNoShadow),scope:'Static pose real warthog, orthographic scene, one directional light and basic shadow map; exact pixel comparison of CPU root translation against shader displacement with matching custom depth material, and negative control without depth displacement. Frustum culling disabled; no animation, terrain, physics, picking or performance.'};
 if(!result.initialToCpu.changed||result.cpuToMissingDepth.changed<100||result.cpuRepeat.changed||result.gpuRepeat.changed||result.cpuToGpu.changed>20||result.cpuToGpu.max>4||result.cpuToGpuNoShadow.changed>20||result.cpuToGpuNoShadow.max>4||!compiled)throw Error('Audit controls failed: '+JSON.stringify(result));
 window.mobilityGpuShadowAudit=result;target.dispose();renderer.dispose();
}catch(error){window.mobilityGpuShadowError=String(error?.stack??error);}
