import {prepareNativeFarGpu} from '../tools/experiments/prepare-native-far-gpu.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {attachBiomeFarVegetation} from '../src/rendering/far-vegetation.js';
const metadata={slot:0,localBase:[0,0,0],day:'./assets/day.webp',night:'./assets/night.webp'};
import {farVegetationProfile} from '../src/rendering/far-vegetation-profile.js';
function fixture(){const textures=[],controllers=[],world={scene:new THREE.Scene(),assetGroups:{omitZeroColor:false},nav:{config:{biome:'savanna',seed:'712'}},loading:new AbortController(),disposed:false};const services={loadManifest:async()=>({biomes:{savanna:[metadata]}}),loadTexture:async()=>{const texture=new THREE.Texture();texture.releases=0;texture.addEventListener('dispose',()=>texture.releases++);textures.push(texture);return texture;},attachSpecies:async()=>{const controller={update(){},dispose(){this.disposed=true;}};controllers.push(controller);return controller;},makeBackdrop:()=>({root:{visible:true},update(){},dispose(){}})};return {world,services,textures,controllers};}

test('HQ profile loads only its chosen biome atlas with stable four-arc settings and retains an explicit legacy switch',async()=>{
 for(const hq of [true,false]){const f=fixture(),paths=[];let settings;const load=f.services.loadTexture;f.services.loadTexture=async path=>{paths.push(path);return load(path);};f.services.makeBackdrop=(_,texture,options)=>{settings=options;return {root:{visible:true},update(){},dispose(){}};};const owner=await attachBiomeFarVegetation(f.world,{...farVegetationProfile({quality:'media',biome:'savanna'}),backdropHQ:hq},f.services);assert.equal(paths.length,3);assert.ok(paths.at(-1).endsWith(hq?'savanna-hq-backdrop.webp':'savanna-backdrop.webp'));assert.equal(settings.arcLayout?.length,hq?4:undefined);assert.equal(settings.stableAltitude,hq?true:undefined);assert.equal(settings.fogBaseMix,hq?1:undefined);owner.dispose();assert.ok(f.textures.every(t=>t.releases===1));}
 const bad=fixture();await assert.rejects(attachBiomeFarVegetation(bad.world,{backdropHQ:'yes'},bad.services),/mountain policy/);assert.equal(bad.textures.length,0);assert.equal(bad.world.farVegetation,undefined);
});
test('integrated quality changes reuse owned adapters and atlas resources within the prepared extent',async()=>{
 const f=fixture(),updates=[];f.world.quality='media';const attach=f.services.attachSpecies;
 f.services.attachSpecies=async(world,options)=>{const a=await attach(world,options);a.configureTransition=(start,end,policy)=>updates.push({start,end,policy});return a;};
 const owner=await attachBiomeFarVegetation(f.world,farVegetationProfile({quality:'media',biome:'savanna'}),f.services),textures=[...f.textures],adapters=[...owner.adapters];
 for(const [quality,range,visualRange]of [['alta',[120,160],2],['muy_baja',[70,100],1],['media',[90,120],1]]){
  f.world.quality=quality;assert.equal(owner.configureQuality(quality),true);owner.update(0);assert.deepEqual([updates.at(-1).start,updates.at(-1).end],range);assert.deepEqual(updates.at(-1).policy,{minimumHeight:24,start:200,end:240});assert.equal(f.world.farVisualRange,visualRange);assert.equal(f.world.farPropTransitionDistance,248);assert.deepEqual(f.textures,textures);assert.deepEqual(owner.adapters,adapters);assert.ok(textures.every(t=>t.releases===0));
 }
 assert.throws(()=>owner.configureQuality('invalid'),/quality/);assert.equal(updates.length,3);owner.dispose();assert.equal(owner.configureQuality('alta'),false);assert.equal(updates.length,3);assert.ok(textures.every(t=>t.releases===1));
 const legacy=fixture(),oldOwner=await attachBiomeFarVegetation(legacy.world,{},legacy.services);assert.equal(oldOwner.configureQuality('alta'),false);oldOwner.dispose();
 const invalid=fixture();await assert.rejects(attachBiomeFarVegetation(invalid.world,{qualityDriven:'yes'},invalid.services),/quality policy/);assert.equal(invalid.textures.length,0);
});
test('attachment loads only selected biome resources and releases them once on world close',async()=>{const f=fixture(),owner=await attachBiomeFarVegetation(f.world,{},f.services);assert.equal(f.textures.length,3);assert.equal(owner.stats.species,1);owner.update(0);assert.equal(f.world.assetGroups.omitZeroColor,true);owner.dispose();owner.dispose();assert.ok(f.textures.every(t=>t.releases===1));assert.ok(f.controllers.every(c=>c.disposed));assert.equal(f.world.farVegetation,null);assert.equal(f.world.assetGroups.omitZeroColor,false);});
test('atmosphere options reach the biome adapter and invalid distances allocate no resources',async()=>{
 const f=fixture();let received;const original=f.services.attachSpecies;f.services.attachSpecies=async(world,options)=>{received=options;return original(world,options);};
 const owner=await attachBiomeFarVegetation(f.world,{fogStart:30,fogEnd:300},f.services);assert.equal(received.fogStart,30);assert.equal(received.fogEnd,300);owner.dispose();
 const invalid=fixture();await assert.rejects(attachBiomeFarVegetation(invalid.world,{fogEnd:NaN},invalid.services),/atmosphere/);assert.equal(invalid.textures.length,0);assert.equal(invalid.world.farVegetation,undefined);
});
test('late texture arriving after attachment cancellation is immediately released',async()=>{const f=fixture();let resolve;f.services.loadTexture=()=>new Promise(r=>resolve=r);const promise=attachBiomeFarVegetation(f.world,{},f.services);while(!resolve)await new Promise(r=>setImmediate(r));f.world.farVegetation.dispose();const texture=new THREE.Texture();let releases=0;texture.addEventListener('dispose',()=>releases++);resolve(texture);await assert.rejects(promise,/cancelled/);assert.equal(releases,1);assert.equal(f.world.farVegetation,null);});
test('late prepared species is disposed after world close without double-releasing earlier textures',async()=>{const f=fixture();let resolve;f.services.attachSpecies=()=>new Promise(r=>resolve=r);const promise=attachBiomeFarVegetation(f.world,{},f.services);while(!resolve)await new Promise(r=>setImmediate(r));f.world.farVegetation.dispose();let releases=0;resolve({dispose(){releases++;}});await assert.rejects(promise,/cancelled/);assert.equal(releases,1);assert.ok(f.textures.every(t=>t.releases===1));});

test('configured visual radius is reversible on disable/dispose and validated before resource loading',async()=>{const f=fixture();f.world.farResidentRange=3;const owner=await attachBiomeFarVegetation(f.world,{residentRange:1},f.services);owner.update(0);assert.equal(f.world.farResidentRange,1);owner.enabled=false;owner.update(0);assert.equal(f.world.farResidentRange,3);owner.enabled=true;owner.update(0);assert.equal(f.world.farResidentRange,1);owner.dispose();assert.equal(f.world.farResidentRange,3);const bad=fixture();await assert.rejects(attachBiomeFarVegetation(bad.world,{residentRange:0},bad.services),/radius/);assert.equal(bad.textures.length,0);assert.equal(bad.world.farVegetation,undefined);});
test('visual-only radius retains loaded radius ownership and restores both preceding values',async()=>{const f=fixture();f.world.farResidentRange=2;f.world.farVisualRange=3;const owner=await attachBiomeFarVegetation(f.world,{visualRange:1},f.services);owner.update(0);assert.equal(f.world.farResidentRange,2);assert.equal(f.world.farVisualRange,1);owner.enabled=false;owner.update(0);assert.equal(f.world.farResidentRange,2);assert.equal(f.world.farVisualRange,3);owner.enabled=true;owner.update(0);owner.dispose();assert.equal(f.world.farVisualRange,3);});
test('prop transition circle is owned and restored independently of exact terrain residency',async()=>{
 const f=fixture();f.world.farPropTransitionDistance=75;const previousSlots=[7];f.world.farPropTransitionSlots=previousSlots;const owner=await attachBiomeFarVegetation(f.world,{visualRange:1,start:40,end:60},f.services);owner.update(0);assert.equal(f.world.farPropTransitionDistance,68);assert.deepEqual(f.world.farPropTransitionSlots,[0]);assert.equal(f.world.farPreserveTerrain,true);owner.enabled=false;owner.update(0);assert.equal(f.world.farPropTransitionDistance,75);assert.equal(f.world.farPropTransitionSlots,previousSlots);owner.enabled=true;owner.update(0);owner.dispose();assert.equal(f.world.farPropTransitionDistance,75);assert.equal(f.world.farPropTransitionSlots,previousSlots);
 const invalid=fixture();await assert.rejects(attachBiomeFarVegetation(invalid.world,{transitionMargin:NaN},invalid.services),/transition distances/);assert.equal(invalid.textures.length,0);
});


test('closing the biome owner releases native upload cache listeners before disposing its atlas textures',async()=>{
 const f=fixture(),listeners=new Set(),gl={SYNC_GPU_COMMANDS_COMPLETE:1,ALREADY_SIGNALED:2,CONDITION_SATISFIED:3,WAIT_FAILED:4,NO_ERROR:0,isContextLost:()=>false,fenceSync:()=>({}),flush(){},clientWaitSync:()=>2,deleteSync(){},getError:()=>0};
 f.world.renderer={domElement:{addEventListener:(name,fn)=>listeners.add(fn),removeEventListener:(name,fn)=>listeners.delete(fn)},getContext:()=>gl,initTexture(){},compileAsync:async()=>{},autoClear:true,getViewport:v=>v.set(0,0,10,10),getScissor:v=>v.set(0,0,10,10),getScissorTest:()=>false,setViewport(){},setScissor(){},setScissorTest(){},render(){}};
 const original=f.services.attachSpecies;f.services.attachSpecies=async(world,options)=>{await prepareNativeFarGpu(world.renderer,new THREE.Group(),world.scene,new THREE.PerspectiveCamera(),[options.texture,options.prelitAtlas.night],{nextFrame:async()=>{}});return original(world,options);};
 const owner=await attachBiomeFarVegetation(f.world,{},f.services);assert.equal(listeners.size,2);assert.equal(f.textures[0]._listeners.dispose.length,2);owner.dispose();assert.equal(listeners.size,0);assert.equal(f.textures[0]._listeners.dispose.length,1);assert.ok(f.textures.every(t=>t.releases===1));
});

function gpuFixture(f){
 const listeners=new Set(),gl={SYNC_GPU_COMMANDS_COMPLETE:1,ALREADY_SIGNALED:2,CONDITION_SATISFIED:3,WAIT_FAILED:4,NO_ERROR:0,isContextLost:()=>false,fenceSync:()=>({}),flush(){},clientWaitSync:()=>2,deleteSync(){},getError:()=>0};
 f.world.renderer={domElement:{addEventListener:(name,fn)=>listeners.add(fn),removeEventListener:(name,fn)=>listeners.delete(fn)},getContext:()=>gl,initTexture(){},compileAsync:async()=>{},autoClear:true,getViewport:v=>v.set(0,0,10,10),getScissor:v=>v.set(0,0,10,10),getScissorTest:()=>false,setViewport(){},setScissor(){},setScissorTest(){},render(){}};return listeners;
}
for(const replaceOwner of [false,true])test('late GPU callback cannot resurrect closed owner or disturb replacement '+replaceOwner,async()=>{
 const f=fixture(),listeners=gpuFixture(f);let proceed,started;const barrier=new Promise(r=>proceed=r),entered=new Promise(r=>started=r),original=f.services.attachSpecies;
 f.services.attachSpecies=async(world,options)=>{started();await barrier;await prepareNativeFarGpu(world.renderer,new THREE.Group(),world.scene,new THREE.PerspectiveCamera(),[options.texture,options.prelitAtlas.night],{nextFrame:async()=>{}});return original(world,options);};
 const pending=attachBiomeFarVegetation(f.world,{},f.services);await entered;f.world.farVegetation.dispose();assert.equal(listeners.size,0);let replacement;
 if(replaceOwner){f.services.attachSpecies=async(world,options)=>{await prepareNativeFarGpu(world.renderer,new THREE.Group(),world.scene,new THREE.PerspectiveCamera(),[options.texture,options.prelitAtlas.night],{nextFrame:async()=>{}});return original(world,options);};replacement=await attachBiomeFarVegetation(f.world,{},f.services);assert.equal(listeners.size,2);}
 proceed();await assert.rejects(pending,/cancelled/);assert.equal(f.world.disposed,false);assert.equal(f.world.farVegetation,replacement??null);assert.equal(listeners.size,replaceOwner?2:0);assert.ok(f.textures.slice(0,2).every(t=>t.releases===1&&t._listeners.dispose.length===1));
 if(replacement){replacement.update(0);assert.equal(f.world.assetGroups.omitZeroColor,true);replacement.dispose();assert.equal(listeners.size,0);}assert.ok(f.textures.every(t=>t.releases===1));
});

test('faithful impostors remain exact until the atmospheric far landscape and distances stay configurable',async()=>{
 for(const end of [60,90,170]){const f=fixture();let received;const original=f.services.attachSpecies;f.services.attachSpecies=async(world,options)=>{received=options;return original(world,options);};const owner=await attachBiomeFarVegetation(f.world,{start:40,end},f.services);assert.equal(received.densityStart,Math.max(180,end+30));assert.equal(received.densityEnd,280);assert.equal(received.fadeStart,280);assert.equal(received.fadeEnd,330);const {farDensityFade}=await import('../tools/experiments/far-impostor-math.js');for(const rank of [.001,.5,.9124892950057983,.999])assert.equal(farDensityFade(120,rank,{start:received.densityStart,end:received.densityEnd,minimum:received.densityMinimum}),1);owner.dispose();}
 const f=fixture();let received;f.services.attachSpecies=async(_,options)=>{received=options;return {update(){},dispose(){}};};const owner=await attachBiomeFarVegetation(f.world,{densityStart:160,densityEnd:250,fadeStart:250,fadeEnd:320},f.services);assert.deepEqual([received.densityStart,received.densityEnd,received.fadeStart,received.fadeEnd],[160,250,250,320]);owner.dispose();
});

test('far ground is independently configurable without changing exact terrain ownership',async()=>{
 const f=fixture();let received;const original=f.services.attachSpecies;f.services.attachSpecies=async(world,options)=>{received=options;return original(world,options);};f.world.farPreserveTerrain=true;const owner=await attachBiomeFarVegetation(f.world,{includeFarGround:false,preserveTerrain:true},f.services);assert.equal(received.includeGround,false);owner.update(0);assert.equal(f.world.farPreserveTerrain,true);assert.equal(owner.stats.species,1);owner.dispose();assert.equal(f.world.farPreserveTerrain,true);assert.ok(f.textures.every(t=>t.releases===1));
 const invalid=fixture();await assert.rejects(attachBiomeFarVegetation(invalid.world,{includeFarGround:'no'},invalid.services),/far ground/);assert.equal(invalid.textures.length,0);assert.equal(invalid.world.farVegetation,undefined);
});

test('logical native prewarm stays opt-in and invalid options allocate no atlas',async()=>{
 const f=fixture();let received;f.services.attachSpecies=async(_,options)=>{received=options;return {update(){},dispose(){}};};const owner=await attachBiomeFarVegetation(f.world,{},f.services);assert.equal(received.logicalStandbyPreload,false);owner.dispose();
 const on=fixture();on.services.attachSpecies=async(_,options)=>{assert.equal(options.logicalStandbyPreload,true);return {update(){},dispose(){}};};const active=await attachBiomeFarVegetation(on.world,{logicalStandbyPreload:true},on.services);assert.equal(active.stats.logicalStandbyPreload,true);active.dispose();
 const bad=fixture();await assert.rejects(attachBiomeFarVegetation(bad.world,{logicalStandbyPreload:1},bad.services),/logical standby/);assert.equal(bad.textures.length,0);
});
test('seed changes invalidate the whole far owner and release borrowed preparations once',async()=>{
 const f=fixture();f.world.state={seed:'one'};const owner=await attachBiomeFarVegetation(f.world,{logicalStandbyPreload:true},f.services);owner.update(0);f.world.state.seed='two';owner.update(0);assert.equal(f.world.farVegetation,null);assert.ok(f.textures.every(t=>t.releases===1));assert.ok(f.controllers.every(c=>c.disposed));owner.dispose();assert.ok(f.textures.every(t=>t.releases===1));
});

test('texture storage estimates use loaded atlas dimensions rather than a uniform species size',async()=>{
 const f=fixture();const original=f.services.loadTexture;let calls=0;f.services.loadTexture=async(...args)=>{const texture=await original(...args);texture.image=calls++<2?{width:2048,height:1024}:{width:2048,height:512};return texture;};
 const owner=await attachBiomeFarVegetation(f.world,{},f.services);assert.equal(owner.stats.estimatedAtlasTextureBytes,2*2048*1024*4*4/3);assert.equal(owner.stats.estimatedBackdropTextureBytes,2048*512*4*4/3);owner.dispose();assert.ok(f.textures.every(t=>t.releases===1));
});


test('landscape composition forwards existing backdrop controls without altering atlas ownership',async()=>{
 const f=fixture();let received;f.services.makeBackdrop=(world,texture,options)=>{received=options;return {root:{visible:true},update(){},dispose(){}};};
 const owner=await attachBiomeFarVegetation(f.world,{backdropHeight:180,backdropRadius:600,backdropParallax:.04,backdropFogMix:.7,groundWash:0},f.services);
 assert.equal(received.height,180);assert.equal(received.radius,600);assert.equal(received.parallax,.04);assert.equal(received.fogMix,.7);assert.equal(f.textures.length,3);owner.dispose();assert.ok(f.textures.every(t=>t.releases===1));
});


test('runtime metadata selects linear premultiplied atlases without changing unmarked species',async()=>{
 for(const marked of [false,true]){const f=fixture();f.services.loadManifest=async()=>({biomes:{savanna:[{...metadata,...(marked?{prelitAlphaEncoding:'srgb-encoded-linear-premultiplied'}:{})}]}});f.services.attachSpecies=async(_,options)=>{assert.equal(options.prelitAtlas.premultipliedLinear,marked);return {update(){},dispose(){}};};const owner=await attachBiomeFarVegetation(f.world,{},f.services);owner.dispose();assert.ok(f.textures.every(t=>t.releases===1));}
});


test('authored large-tree policy preserves the native color transition envelope and rejects invalid policy before assets',async()=>{
 const f=fixture(),policy={minimumHeight:24,start:200,end:240};const owner=await attachBiomeFarVegetation(f.world,{start:90,end:120,visualRange:1,transitionHeight:policy},f.services);policy.end=400;owner.update(0);assert.equal(f.world.farPropTransitionDistance,248);owner.dispose();assert.equal(f.world.farPropTransitionDistance,undefined);
 const bad=fixture();await assert.rejects(attachBiomeFarVegetation(bad.world,{transitionHeight:{minimumHeight:24,start:20,end:240}},bad.services),/height policy/);assert.equal(bad.textures.length,0);
});


test('loading-only bitmap textures retain far-owner disposal and native vertical orientation',async()=>{
 const f=fixture(),oldWorker=globalThis.Worker,oldBitmap=globalThis.createImageBitmap,requests=[],nativeLoad=f.services.loadTexture;
 try{globalThis.Worker=function(){};globalThis.createImageBitmap=()=>{};f.world.loadingProgress={};f.world.assets={loadingTexture:async(path,options)=>{requests.push({path,options});return nativeLoad(path);}};delete f.services.loadTexture;f.services.loadManifest=async()=>({biomes:{savanna:[{...metadata,prelitAlphaEncoding:'srgb-encoded-linear-premultiplied'}]}});
 const owner=await attachBiomeFarVegetation(f.world,{},f.services);assert.equal(requests.length,3);assert.ok(requests.every(r=>r.options.flipY===true&&!r.options.premultiplyAlpha));owner.dispose();assert.ok(f.textures.every(t=>t.releases===1));
 }finally{if(oldWorker===undefined)delete globalThis.Worker;else globalThis.Worker=oldWorker;if(oldBitmap===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=oldBitmap;}
});
