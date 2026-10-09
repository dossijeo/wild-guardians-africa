import {loadingSyncWitness,loadingAwaitWitness} from './loading-sync-witness.js';
import {waitGpuFrame} from '../../tools/experiments/wait-gpu-frame.js';
import {compileLoadingPrograms} from './loading-programs.js';
import * as THREE from 'three';
import {json} from './assets.js';
import {assetUrl} from './asset-url.js';
import {createCropBatchAsync} from './crop-batch.js';
import {loadCropBridges} from './crop-library.js';
import {LoadingPlants} from './loading-plants.js';
import {LoadingTextureOwner} from './loading-texture-owner.js';
import {LoadingOrbit} from './loading-orbit.js';
import {LoadingMist} from './loading-mist.js';
import {LoadingSparkles} from './loading-sparkles.js';
import {LoadingFocusLight} from './loading-focus-light.js';
import {createBiomeBackdrop} from './biome-backdrop.js';
import {mountainBackdropProfile} from './mountain-backdrop-profile.js';
import {withScreenTarget} from './screen-target.js';
import {AfricanToon} from './african-toon.js';
import {skyNight} from './sky.js';
import {renderScreenPreload,waitForGpuPreload} from './screen-preload.js';

// Borrows the world renderer, sky and asset collection. Only local geometries,
// cloned materials and the small instanced crop batch belong to this owner.
export class LoadingDiorama {
  constructor(world,{state={day:1,time:0,biome:'sabana'},focusVignette=true,reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false}={}) {
    this.world=world;this.textureOwner=new LoadingTextureOwner();world.assets.asyncTextureImages=true;this.state=state;this.scene=new THREE.Scene();this.plants=new LoadingPlants();this.camera=new THREE.PerspectiveCamera(40,1,.1,80);this.camera.position.set(4.8,3.1,6.4);this.camera.lookAt(0,1.15,0);this.baseQuaternion=this.camera.quaternion.clone();
    this.sun=new THREE.DirectionalLight('#ffe2a8',3);this.sun.position.set(-30,55,25);this.ambient=new THREE.HemisphereLight('#ebf1d9','#765b3b',2);this.scene.add(this.sun,this.ambient);
    this.toon=new AfricanToon();this.toon.uniforms.uFineNoise.value=0;
    this.orbit=new LoadingOrbit({reducedMotion});this.focus=new THREE.Vector3(0,1.15,0);this.focusLight=new LoadingFocusLight({enabled:focusVignette});
    this.ray=new THREE.Raycaster();this.cursor=new THREE.Vector2();this.abort=new AbortController();
    const geometry=new THREE.PlaneGeometry(15,15,32,32),material=new THREE.MeshStandardMaterial({color:'#915432',roughness:1,metalness:0,transparent:true,depthWrite:true});
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 vLoadingSoil;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLoadingSoil=position.xy;');
      shader.fragmentShader='varying vec2 vLoadingSoil;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
        vec3 soilColor=texture2D(map,fract(vMapUv*3.)).rgb;
        float soilLuma=dot(soilColor,vec3(.2126,.7152,.0722));
        soilColor=mix(vec3(soilLuma),soilColor,.52);
        diffuseColor.rgb*=pow(soilColor,vec3(2.2));
      #endif`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float soilRadius=length(vLoadingSoil);
        float irregular=sin(vLoadingSoil.x*.9+sin(vLoadingSoil.y*.7))*.24+sin(vLoadingSoil.y*1.1)*.17;
        diffuseColor.a*=1.-smoothstep(4.5,7.2,soilRadius+irregular);
        if(diffuseColor.a<.01)discard;
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey=()=> 'loading-soil-existing-earth-soft-edge-v3';
    this.ground=new THREE.Mesh(geometry,material);this.ground.rotation.x=-Math.PI/2;this.ground.position.y=.09;this.scene.add(this.ground);
    this.sparkles=new LoadingSparkles(this.scene);this.mist=new LoadingMist(world.sky,this.focusLight.uniforms);this.scene.fog=new THREE.Fog(this.mist.day,18,28);
    let down=null;world.canvas.addEventListener('pointerdown',e=>{if(this.interactive&&e.button===0){this.pointerType=e.pointerType==='touch'?'touch':'mouse';down={x:e.clientX,y:e.clientY,id:e.pointerId};this.orbit.beginInteraction();world.canvas.setPointerCapture?.(e.pointerId);e.preventDefault();}},{signal:this.abort.signal});
    world.canvas.addEventListener('pointerup',e=>{if(!down||e.pointerId!==down.id)return;const start=down;down=null;this.orbit.endInteraction();if(this.interactive&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<12)this.plantAt(e.clientX,e.clientY);},{signal:this.abort.signal});
    world.canvas.addEventListener('pointercancel',()=>{down=null;this.orbit.endInteraction();},{signal:this.abort.signal});
    world.canvas.addEventListener('lostpointercapture',()=>{down=null;this.orbit.endInteraction();},{signal:this.abort.signal});
  }
  async prepare() {
    const {world}=this,phase=(label,run)=>loadingAwaitWitness(world.onLoadingSpan,label,run),sync=(label,run)=>loadingSyncWitness(world.onLoadingSpan,label,run);await phase('diorama-prepare-sky',()=>world.loadReady(world.sky.load()));if(this.disposed)throw Error('Loading diorama cancelled');
    const [models,bridges,ground]=await phase('diorama-prepare-catalogues',()=>world.loadReady(Promise.all([json('/content/models.json',{signal:world.loading.signal}),json('/content/crop-bridges.json',{signal:world.loading.signal}),json('/content/ground-materials.json',{signal:world.loading.signal})])));
    const descriptor=models.find(m=>m.source.includes('Cultivos'));if(!descriptor)throw Error('Missing native maize model');
    const [gltf,preparedBridges]=await Promise.all([phase('diorama-prepare-maize-model',()=>world.loadReady(world.assets.model(descriptor.url))),phase('diorama-prepare-maize-bridges',()=>world.loadReady(loadCropBridges(bridges,url=>world.assets.model(url))))]);if(this.disposed)throw Error('Loading diorama cancelled');
    // Reuse the existing canyon earth bitmap through the world's cache. The
    // diorama borrows its pixel Source through a locally owned Texture object.
    // This does not decode/copy pixels or require separate shared GL storage.
    this.ground.material.map=this.textureOwner.borrow(await phase('diorama-prepare-soil-texture',()=>world.loadReady(world.assets.texture(ground.canyons.base,false))));
    this.ground.material.color.set('#a59b8d');this.ground.material.needsUpdate=true;
    const mountains=mountainBackdropProfile('savanna',712),atlasUrl=assetUrl(mountains.atlas);
    // The far-world loader has a separate flipped atlas owner. Keep this
    // loading-only Source local, including cleanup of arrivals after abort.
    const atlasPending=this.loadBackdropTexture(atlasUrl);
    const mountainTexture=await phase('diorama-prepare-mountain-atlas',()=>world.loadReady(atlasPending));
    const layout=mountains.arcLayout.slice(0,3).map((arc,index)=>({...arc,angle:Math.atan2(-4.8,-6.4)+(index-1)*.45,height:index===1?6.5:4.6,baseY:-1.4}));
    const backdropOwner={scene:this.scene,camera:this.camera,nav:{config:{biome:'savanna'},field:{surface:()=>0}},toon:this.toon};
    this.backdrop=createBiomeBackdrop(backdropOwner,mountainTexture,{radius:35,arcLayout:layout,stableAltitude:false,parallax:0,fogMix:.2,fogBaseMix:.8,fogDayColor:'#decba6',fogNightColor:'#26364a'});
    // Feather only this presentation's atlas foot into the analytic haze.
    featherLoadingBackdrop(this.backdrop);
    this.batch=await phase('diorama-prepare-maize-batch',()=>createCropBatchAsync(this.scene,world.renderer,gltf,preparedBridges,this.plants.capacity,{species:['maiz'],shadows:false,signal:this.abort.signal,cancelled:()=>this.disposed||world.disposed}));this.scene.traverse(object=>{for(const material of [object.material].flat().filter(Boolean))this.textureOwner.material(material);});this.toon.environment(world.sky.environmentTextures,world.sky.uniforms.uSkyYaw);this.toon.apply(this.scene);
    // A small cold presentation fill belongs only to the diorama maize. It
    // reuses the existing night-light uniform/GLSL; soil and real-world lighting
    // keep their original values, without another light, pass or shader define.
    this.cropNightFill={value:2.05};const filled=new Set();
    this.scene.traverse(mesh=>{if(!mesh.isInstancedMesh)return;for(const material of [mesh.material].flat()){
      if(filled.has(material))continue;filled.add(material);const compile=material.onBeforeCompile;
      material.onBeforeCompile=(shader,renderer)=>{compile.call(material,shader,renderer);shader.uniforms.uNightLight=this.cropNightFill;};
    }});
    const focused=new Set();this.scene.traverse(mesh=>{for(const material of [mesh.material].flat().filter(Boolean)){if(focused.has(material)||(!material.isMeshStandardMaterial&&!material.isMeshPhysicalMaterial))continue;focused.add(material);this.focusLight.apply(material);}});
    // Warm all five stages and four morph bridges, including ones not present in
    // the first frame. Counts/visibility restored before accepting interaction.
    const saved=[];this.scene.traverse(mesh=>{if(mesh.isInstancedMesh){saved.push([mesh,mesh.count,mesh.visible]);mesh.count=1;mesh.visible=true;}});
    const shadow=world.renderer.shadowMap.enabled;
    try{world.renderer.shadowMap.enabled=false;await phase('diorama-compile-maize',()=>compileLoadingPrograms(world.renderer,this.scene,this.camera,undefined,{signal:this.abort.signal,cancelled:()=>world.disposed,screen:true}));if(this.disposed)throw Error('Loading diorama cancelled');sync('diorama-upload-maize-soil',()=>renderScreenPreload(world.renderer,this.scene,this.camera));await phase('diorama-compile-sky',()=>compileLoadingPrograms(world.renderer,world.sky.scene,this.camera,undefined,{signal:this.abort.signal,cancelled:()=>world.disposed,screen:true}));await phase('diorama-compile-mist',()=>compileLoadingPrograms(world.renderer,this.mist.scene,this.camera,undefined,{signal:this.abort.signal,cancelled:()=>world.disposed,screen:true}));sync('diorama-upload-mist',()=>renderScreenPreload(world.renderer,this.mist.scene,this.camera));sync('diorama-warm-day-night-sky',()=>{world.sky.render(world.renderer,this.camera,{day:1,time:0});world.sky.render(world.renderer,this.camera,{day:1,time:310});});await phase('diorama-final-fence',()=>waitForGpuPreload(world.renderer,{signal:this.abort.signal,cancelled:()=>this.disposed||world.disposed,getEpoch:()=>world.glResourceEpoch?.stats.epoch??0}));}
    finally{world.renderer.shadowMap.enabled=shadow;for(const [mesh,count,visible] of saved){mesh.count=count;mesh.visible=visible;}}
    this.prepared=true;return this;
  }
  loadBackdropTexture(url){
    const {world}=this;return (typeof Worker!=='undefined'&&typeof createImageBitmap==='function'?world.assets.loadingTexture(url,{flipY:true,premultiplyAlpha:false}):world.assets.textures.loadAsync(url)).then(texture=>{if(this.disposed||world.disposed){texture.dispose();throw new DOMException('Loading diorama cancelled','AbortError');}this.backdropTexture=texture;return texture;});
  }
  plantAt(clientX,clientY) {
    const rect=this.world.canvas.getBoundingClientRect();this.cursor.set((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2);this.camera.updateMatrixWorld();this.ray.setFromCamera(this.cursor,this.camera);
    const hit=this.ray.intersectObject(this.ground)[0],plant=hit?this.plants.plant(hit.point.x,hit.point.z):null;if(plant)this.onPlant?.(plant);return plant;
  }
  show(state) {this.state=state;this.interactive=true;this.world.controls.enabled=false;}
  render(dt,progress,{ready=false,skyOnly=false}={}) {
    if(!this.prepared||this.disposed)return;
    const {world}=this;world.resize();this.camera.aspect=world.camera.aspect;if(!world.cinematic){const portrait=this.camera.aspect<.8,distance=portrait?1.65:1,height=portrait?1.45:1,angle=this.orbit.step(dt),sin=Math.sin(angle),cos=Math.cos(angle);this.camera.position.set((4.8*cos+6.4*sin)*distance,3.1*height,(6.4*cos-4.8*sin)*distance);this.camera.lookAt(this.focus);}this.camera.updateProjectionMatrix();this.plants.update(dt,progress,{ready});this.batch.update(this.plants.plants,this.orbit.reducedMotion?0:this.plants.time,()=>0);
    const night=skyNight(this.state);this.night=night;this.focusLight.update(world.renderer,this.camera,this.focus,night);this.toon.update(night,this.sun,this.state.biome);this.toon.uniforms.uNightLight.value=1.8;this.sun.intensity=3-2.6*night;this.ambient.intensity=2-.9*night;this.scene.fog.color.copy(this.mist.day).lerp(this.mist.night,night);this.backdrop?.update();this.sparkles.update(this.plants.time,night,this.orbit.reducedMotion);
    const shadow=world.renderer.shadowMap.enabled,autoClear=world.renderer.autoClear;
    try{world.renderer.shadowMap.enabled=false;world.renderer.autoClear=false;withScreenTarget(world.renderer,()=>{world.renderer.clear();world.sky.render(world.renderer,this.camera,this.state);if(!skyOnly){this.mist.render(world.renderer,this.camera,night);world.renderer.render(this.scene,this.camera);}});}
    finally{world.renderer.shadowMap.enabled=shadow;world.renderer.autoClear=autoClear;}
  }
  async freezeForCinematic({nextFrame,timeout=30000}={}) {
    this.stopPlanting();this.orbit.stop();
    const signal=this.abort.signal,waiting=performance.now();
    const check=()=>{if(this.disposed||this.world.disposed||signal.aborted)throw Error('Loading orbit cancelled');if(performance.now()-waiting>timeout)throw Error('Loading orbit timed out');};
    while(!this.orbit.settled){check();await waitGpuFrame({check,signal,nextFrame});}
    check();
    this.camera.updateMatrixWorld();
  }
  stopPlanting(){this.interactive=false;this.plants.stopPlanting();}

  dispose(){if(this.disposed)return;this.disposed=true;this.interactive=false;this.abort.abort();this.batch?.dispose();this.sparkles?.dispose();this.backdrop?.dispose();this.backdropTexture?.dispose();this.mist.dispose();this.ground.geometry.dispose();this.ground.material.dispose();this.textureOwner.dispose();this.toon.shadowUniforms.uNativeShadowFiltered.value=null;this.toon.shadowUniforms.fallback.dispose();this.scene.clear();}
}


export function featherLoadingBackdrop(backdrop){
 let changed=0;backdrop.root.traverse(mesh=>{if(!mesh.material?.isShaderMaterial)return;const source=mesh.material.fragmentShader,next=source.replace(',1.);\n #include <colorspace_fragment>',',smoothstep(.02,.4,vBackdropHeight)*c.a);\n #include <colorspace_fragment>');if(next===source)throw Error('Missing loading backdrop alpha recipe');mesh.material.transparent=true;mesh.material.fragmentShader=next;changed++;});
 if(!changed)throw Error('Missing loading backdrop material');return backdrop;
}
