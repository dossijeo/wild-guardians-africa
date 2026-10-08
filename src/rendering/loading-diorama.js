import {compileLoadingPrograms} from './loading-programs.js';
import * as THREE from 'three';
import {json} from './assets.js';
import {createCropBatchAsync} from './crop-batch.js';
import {LoadingPlants} from './loading-plants.js';
import {AfricanToon} from './african-toon.js';
import {skyNight} from './sky.js';
import {renderScreenPreload,waitForGpuPreload} from './screen-preload.js';

// Borrows the world renderer, sky and asset collection. Only local geometries,
// cloned materials and the small instanced crop batch belong to this owner.
export class LoadingDiorama {
  constructor(world,{state={day:1,time:0,biome:'sabana'}}={}) {
    this.world=world;world.assets.asyncTextureImages=true;this.state=state;this.scene=new THREE.Scene();this.plants=new LoadingPlants();this.camera=new THREE.PerspectiveCamera(42,1,.1,80);this.camera.position.set(8,7.5,10);this.camera.lookAt(0,.65,0);this.baseQuaternion=this.camera.quaternion.clone();
    this.sun=new THREE.DirectionalLight('#ffe2a8',3);this.sun.position.set(-30,55,25);this.ambient=new THREE.HemisphereLight('#ebf1d9','#765b3b',2);this.scene.add(this.sun,this.ambient);
    this.toon=new AfricanToon();this.toon.uniforms.uFineNoise.value=0;
    this.ray=new THREE.Raycaster();this.cursor=new THREE.Vector2();this.abort=new AbortController();
    const geometry=new THREE.PlaneGeometry(15,15,32,32),material=new THREE.MeshStandardMaterial({color:'#915432',roughness:1,metalness:0,transparent:true,depthWrite:true});
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 vLoadingSoil;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLoadingSoil=position.xy;');
      shader.fragmentShader='varying vec2 vLoadingSoil;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
        vec3 soilColor=texture2D(map,fract(vMapUv*3.)).rgb;
        diffuseColor.rgb*=pow(soilColor,vec3(2.2));
      #endif`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float soilRadius=length(vLoadingSoil);
        float irregular=sin(vLoadingSoil.x*.9+sin(vLoadingSoil.y*.7))*.24+sin(vLoadingSoil.y*1.1)*.17;
        diffuseColor.a*=1.-smoothstep(4.5,7.2,soilRadius+irregular);
        if(diffuseColor.a<.01)discard;
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey=()=> 'loading-soil-existing-earth-soft-edge-v2';
    this.ground=new THREE.Mesh(geometry,material);this.ground.rotation.x=-Math.PI/2;this.ground.position.y=.09;this.scene.add(this.ground);
    this.scene.fog=new THREE.Fog('#a8b5c8',14,25);
    let down=null;world.canvas.addEventListener('pointerdown',e=>{if(this.interactive&&e.button===0){down={x:e.clientX,y:e.clientY,id:e.pointerId};e.preventDefault();}},{signal:this.abort.signal});
    world.canvas.addEventListener('pointerup',e=>{if(!down||e.pointerId!==down.id)return;const start=down;down=null;if(this.interactive&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<12)this.plantAt(e.clientX,e.clientY);},{signal:this.abort.signal});
    world.canvas.addEventListener('pointercancel',()=>{down=null;},{signal:this.abort.signal});
  }
  async prepare() {
    const {world}=this;await world.loadReady(world.sky.load());if(this.disposed)throw Error('Loading diorama cancelled');
    const [models,bridges,ground]=await world.loadReady(Promise.all([json('/content/models.json',{signal:world.loading.signal}),json('/content/crop-bridges.json',{signal:world.loading.signal}),json('/content/ground-materials.json',{signal:world.loading.signal})]));
    const descriptor=models.find(m=>m.source.includes('Cultivos'));if(!descriptor)throw Error('Missing native maize model');
    const gltf=await world.loadReady(world.assets.model(descriptor.url));if(this.disposed)throw Error('Loading diorama cancelled');
    // Reuse the existing canyon earth bitmap through the world's cache. The
    // diorama borrows it and does not clone/upload another texture.
    this.ground.material.map=await world.loadReady(world.assets.texture(ground.canyons.base,false));
    this.ground.material.color.set('#c9865e');this.ground.material.needsUpdate=true;
    this.batch=await createCropBatchAsync(this.scene,world.renderer,gltf,bridges,this.plants.capacity,{species:['maiz'],shadows:false,cancelled:()=>this.disposed||world.disposed});this.toon.environment(world.sky.environmentTextures,world.sky.uniforms.uSkyYaw);this.toon.apply(this.scene);
    // Warm all five stages and four morph bridges, including ones not present in
    // the first frame. Counts/visibility restored before accepting interaction.
    const saved=[];this.scene.traverse(mesh=>{if(mesh.isInstancedMesh){saved.push([mesh,mesh.count,mesh.visible]);mesh.count=1;mesh.visible=true;}});
    const shadow=world.renderer.shadowMap.enabled;
    try{world.renderer.shadowMap.enabled=false;await compileLoadingPrograms(world.renderer,this.scene,this.camera,undefined,{signal:this.abort.signal,cancelled:()=>world.disposed,screen:true});if(this.disposed)throw Error('Loading diorama cancelled');renderScreenPreload(world.renderer,this.scene,this.camera);await compileLoadingPrograms(world.renderer,world.sky.scene,this.camera,undefined,{signal:this.abort.signal,cancelled:()=>world.disposed,screen:true});world.sky.render(world.renderer,this.camera,{day:1,time:0});world.sky.render(world.renderer,this.camera,{day:1,time:310});await waitForGpuPreload(world.renderer,{cancelled:()=>this.disposed||world.disposed});}
    finally{world.renderer.shadowMap.enabled=shadow;for(const [mesh,count,visible] of saved){mesh.count=count;mesh.visible=visible;}}
    this.prepared=true;return this;
  }
  plantAt(clientX,clientY) {
    const rect=this.world.canvas.getBoundingClientRect();this.cursor.set((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2);this.ray.setFromCamera(this.cursor,this.camera);
    const hit=this.ray.intersectObject(this.ground)[0];return hit?this.plants.plant(hit.point.x,hit.point.z):null;
  }
  show(state) {this.state=state;this.interactive=true;this.world.controls.enabled=false;}
  render(dt,progress,{ready=false,skyOnly=false}={}) {
    if(!this.prepared||this.disposed)return;
    const {world}=this;world.resize();this.camera.aspect=world.camera.aspect;this.camera.updateProjectionMatrix();this.plants.update(dt,progress,{ready});this.batch.update(this.plants.plants,this.plants.time,()=>0);
    const night=skyNight(this.state);this.toon.update(night,this.sun,this.state.biome);this.sun.intensity=3-2.6*night;this.ambient.intensity=2-.9*night;this.scene.fog.color.set(night?'#253448':'#cbd5be');
    const shadow=world.renderer.shadowMap.enabled,autoClear=world.renderer.autoClear;
    try{world.renderer.shadowMap.enabled=false;world.renderer.autoClear=false;world.renderer.clear();world.sky.render(world.renderer,this.camera,this.state);if(!skyOnly)world.renderer.render(this.scene,this.camera);}
    finally{world.renderer.shadowMap.enabled=shadow;world.renderer.autoClear=autoClear;}
  }
  stopPlanting(){this.interactive=false;this.plants.stopPlanting();}
  dispose(){if(this.disposed)return;this.disposed=true;this.interactive=false;this.abort.abort();this.batch?.dispose();this.ground.geometry.dispose();this.ground.material.dispose();this.scene.clear();}
}
