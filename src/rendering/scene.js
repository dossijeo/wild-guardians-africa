import {centerCulture} from '../world/centers.js';
import * as THREE from 'three';
import {AfricanToon,paintedWaterMaterial} from './african-toon.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {Assets,json} from './assets.js';
import {NativeSky,skyNight} from './sky.js';
import {waterTime} from './world-atmosphere.js';
import {nativeChunkWater,nativeAssetWater} from './water-geometry.js';
import {cropSpec} from '../simulation/rules.js';
import {BIOME_IDS} from '../world/navigation.js';
import {createCropBatch} from './crop-batch.js';
import {applyWorkerPose,nativeCrate} from './worker-actions.js';
import {applyAnimalPose,prepareAnimalClips,animalGroundSamples,prepareAnimalModel} from './animal-actions.js';
import {NativeHands} from './hands.js';
import {tutorialHandTarget} from './tutorial-hand-target.js';
import {NativeWall} from './walls.js';
import {WallDrawing} from './wall-drawing.js';
import {NativeBuilding,BuildingDestructionPass} from './buildings.js';
import {VfxLibrary} from './vfx.js';
import {WorkVfx} from './work-vfx.js';
import {AttackVfx} from './attack-vfx.js';
import {ShieldVfx} from './shield-vfx.js';
import {AgricultureVfx} from './agriculture-vfx.js';
import {MaterialVfx} from './material-vfx.js';
import {LocomotionVfx} from './locomotion-vfx.js';
import {renderedTerrainSurface} from './terrain-surface.js';
const cropIds=['maiz','algodon','girasol','platano','sorgo','mijo','yuca','batata'];
const marks=[.065,.27,.53,.78,1];
const profileSources={olderMale:'Ganadero_Mayor',olderFemale:'Amara_Mayor',youngMale:'Kofi_Joven',youngFemale:'Amara_Joven'};
const animalSources={warthog:'Facoquero',hyena:'Hiena',buffalo:'Bufalo',lion:'Leon',rhino:'Rinoceronte'};
export class WorldScene {
  constructor(canvas,onPick) {
    this.toon=new AfricanToon();this.canvas=canvas;this.assets=new Assets();this.objects=new Map();this.chunks=new Map();this.mixers=new Map();this.scene=new THREE.Scene();this.sky=new NativeSky();
    this.camera=new THREE.PerspectiveCamera(42,1,.1,600);this.camera.position.set(40,35,50);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.setClearColor('#cbd5be');this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.maxPolarAngle=Math.PI*.47;this.controls.minDistance=8;this.controls.maxDistance=140;this.controls.enableRotate=true;this.controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
    this.sun=new THREE.DirectionalLight('#ffe2a8',3);this.sun.position.set(-30,55,25);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.camera.left=-60;this.sun.shadow.camera.right=60;this.sun.shadow.camera.top=60;this.sun.shadow.camera.bottom=-60;this.sun.shadow.bias=-.0008;
    this.scene.add(this.sun,this.sun.target);this.ambient=new THREE.HemisphereLight('#ebf1d9','#765b3b',2);this.scene.add(this.ambient);
    this.destructionPass=new BuildingDestructionPass(this.renderer,this.sun,this.ambient);this.buildingTemplates=new Map();
    this.raycaster=new THREE.Raycaster();this.cursor=new THREE.Vector2();this.terrainMeshes=[];
    this.preview=new THREE.Mesh(new THREE.RingGeometry(.35,.5,40),new THREE.MeshBasicMaterial({color:'#e8c878',side:THREE.DoubleSide,depthWrite:false}));this.preview.rotation.x=-Math.PI/2;this.preview.visible=false;this.scene.add(this.preview);
    this.strokeLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#49623d',dashSize:.5,gapSize:.25,depthWrite:false}));this.strokeLine.visible=false;this.scene.add(this.strokeLine);
    this.wallDrawing=new WallDrawing(canvas,{point:e=>this.pick(e).point,stroke:points=>this.onWallStroke?.(points),tap:e=>onPick(this.pick(e)),preview:points=>this.showWallStroke(points),gesture:(old,next)=>this.wallCameraGesture(old,next)});
    let down=null;canvas.addEventListener('pointerdown',e=>{if(e.button===0&&!e.shiftKey)down=[e.clientX,e.clientY];});canvas.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<5)onPick(this.pick(e));down=null;});
    canvas.addEventListener('pointercancel',()=>{down=null;});
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.quality='media';this.resize();
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.onContextLost?.();});canvas.addEventListener('webglcontextrestored',()=>this.onContextRestored?.());
  }
  resize() {const r=this.canvas.getBoundingClientRect();this.renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);this.camera.aspect=r.width/Math.max(1,r.height);this.camera.updateProjectionMatrix();}
  showWallStroke(points){
    this.strokeLine.geometry.dispose();this.strokeLine.geometry=new THREE.BufferGeometry().setFromPoints(points.map(([x,z])=>new THREE.Vector3(x,this.nav?.field.surface(x,z)+.06,z)));this.strokeLine.computeLineDistances();this.strokeLine.visible=points.length>1;
  }
  wallCameraGesture(old,next){
    const a=this.pick({clientX:old.x,clientY:old.y}).point,b=this.pick({clientX:next.x,clientY:next.y}).point;
    if(a&&b){const delta=new THREE.Vector3(a.x-b.x,0,a.z-b.z);this.controls.target.add(delta);this.camera.position.add(delta);}
    const offset=this.camera.position.clone().sub(this.controls.target),distance=offset.length(),ratio=old.distance/Math.max(10,next.distance);
    offset.multiplyScalar(Math.max(this.controls.minDistance,Math.min(this.controls.maxDistance,distance*ratio))/distance);this.camera.position.copy(this.controls.target).add(offset);this.controls.update();
  }
  showWallPreview(plan){
    this.clearWallPreview();this.wallPreview=new THREE.Group();
    for(const entity of plan.previewPieces??plan.pieces){const wall=new NativeWall(this.wallPrototypes,entity);wall.position.set(entity.x,this.nav.field.surface(entity.x,entity.z)+.025,entity.z);wall.rotation.y=entity.yaw;for(const {mesh} of wall.parts){mesh.material.transparent=true;mesh.material.opacity=.55;mesh.material.depthWrite=false;mesh.material.color.set('#9cb67b');}this.wallPreview.add(wall);}
    this.scene.add(this.wallPreview);
  }
  clearWallPreview(){if(this.wallPreview){for(const wall of this.wallPreview.children)wall.dispose();this.scene.remove(this.wallPreview);this.wallPreview=null;}}
  qualitySetting(quality) {this.quality=quality;this.destructionPass.quality=['muy_baja','baja'].includes(quality)?0:1;this.destructionPass.effectQuality=quality==='alta'?'high':['muy_baja','baja'].includes(quality)?'low':'medium';this.renderer.setPixelRatio(Math.min(devicePixelRatio,{muy_baja:1,baja:1,media:1.5,alta:2}[quality]??1.5));this.renderer.shadowMap.enabled=['media','alta'].includes(quality);this.sun.shadow.mapSize.set(quality==='alta'?2048:1024,quality==='alta'?2048:1024);this.resize();}
  async load(state,nav,villagePayload) {
    await this.sky.load();this.state=state;this.simElapsed=state.elapsed;this.nav=nav;this.destructionPass.surface=(x,z)=>nav.field.surface(x,z);this.pack=await json('/content/biome-'+BIOME_IDS[state.biome]+'.json');this.prototypes=await this.assets.biome(this.pack);this.waterPrototypes=this.pack.assets.map(nativeAssetWater);this.fluidMaterial=paintedWaterMaterial(this.pack.profile.colors.water,this.state.biome==='volcanes',this.nav.field.seed);
    this.villagePrototypes=await this.assets.village(villagePayload);this.villageTemplates=new Map([[state.culture,this.villagePrototypes]]);
    this.buildingCatalogue=(await json('/content/destruction.json')).buildings;
    await Promise.all([...new Set([...state.villages.map(v=>v.culture),...state.structures.filter(s=>s.kind==='center').map(s=>centerCulture(s,state))])].map(culture=>this.ensureBuilding(culture)));
    [this.models,this.workerLibraries]=await Promise.all([json('/content/models.json'),json('/content/worker-actions.json')]);
    const cropModel=this.models.find(m=>m.source.includes('Cultivos'));
    const gltf=await this.assets.model(cropModel.url);this.cropGltf=gltf;this.cropModels=Array(40);
    gltf.scene.traverse(o=>{if(o.isMesh){const i=o.userData.cropIndex*5+o.userData.stage-1;const mesh=new THREE.Mesh(o.geometry,o.material.clone());mesh.material.metalness=0;mesh.material.roughness=.91;mesh.material.metalnessMap=null;mesh.material.roughnessMap=null;mesh.castShadow=mesh.receiveShadow=true;this.cropModels[i]=mesh;}});
    this.cropBridgeData=await json('/content/crop-bridges.json');this.cropBatch=createCropBatch(this.scene,this.renderer,gltf,this.cropBridgeData);
    this.wallPrototypes=await this.assets.walls(await json('/content/walls.json'));
    const vfxCatalogue=await json('/content/vfx.json');this.vfxLibrary=new VfxLibrary(vfxCatalogue,await this.assets.texture(vfxCatalogue.atlas));
    this.workVfx=new WorkVfx(this.vfxLibrary,this.destructionPass,this.scene,(x,z)=>renderedTerrainSurface(this.nav.field,x,z));
    this.attackVfx=new AttackVfx(this.vfxLibrary,this.destructionPass,this.scene,(x,z)=>renderedTerrainSurface(this.nav.field,x,z));
    this.shieldVfx=new ShieldVfx(this.vfxLibrary,this.destructionPass,this.scene,(x,z)=>renderedTerrainSurface(this.nav.field,x,z));
    this.agricultureVfx=new AgricultureVfx(this.vfxLibrary,this.destructionPass,this.scene,(x,z)=>renderedTerrainSurface(this.nav.field,x,z));
    this.materialVfx=new MaterialVfx(this.vfxLibrary,this.destructionPass,this.scene,(x,z)=>renderedTerrainSurface(this.nav.field,x,z));
    this.locomotionVfx=new LocomotionVfx(this.vfxLibrary,this.destructionPass,this.scene,(x,z)=>renderedTerrainSurface(this.nav.field,x,z));
    const village=state.villages[0];this.focus({x:village.x+20,z:village.z});
    this.syncChunks();this.sync(0);
    this.hands=new NativeHands(this.scene,(x,z)=>this.nav.field.surface(x,z),{motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,onError:e=>this.onError?.(e)});
    await this.hands.ready;
  }
  focus(point) {const y=this.nav?.field.surface(point.x,point.z)??0;this.controls.target.set(point.x,y,point.z);this.camera.position.set(point.x+34,y+32,point.z+40);this.controls.update();}
  terrain(cx,cz) {
    const group=new THREE.Group(),x0=cx*48-24,z0=cz*48-24,n=32,positions=[],indices=[],colors=[];
    const base=new THREE.Color(this.pack.profile.colors.soil),grass=new THREE.Color(this.pack.profile.colors.grass);
    for(let z=0;z<=n;z++)for(let x=0;x<=n;x++) {
      const wx=x0+x*48/n,wz=z0+z*48/n,h=this.nav.field.surface(wx,wz);positions.push(wx,h,wz);
      const color=base.clone().lerp(grass,.2+.25*Math.sin(wx*.12)*Math.sin(wz*.13));colors.push(color.r,color.g,color.b);
    }
    for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x,b=a+n+1;indices.push(a,b,a+1,a+1,b,b+1);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=this.quality==='muy_baja'?new THREE.MeshBasicMaterial({vertexColors:true}):new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
    material.userData.toonGround=true;const ground=new THREE.Mesh(geometry,material);ground.receiveShadow=true;ground.userData.ground=true;group.add(ground);this.terrainMeshes.push(ground);
    const waterGeometry=nativeChunkWater(this.nav.field,cx,cz,this.pack.profile);
    if(waterGeometry){const mesh=new THREE.Mesh(waterGeometry,this.fluidMaterial);mesh.position.set(cx*48,0,cz*48);mesh.receiveShadow=true;mesh.userData.nativeFluid='chunk';group.add(mesh);}
    const chunk=this.nav.chunk(cx,cz);
    for(let i=0;i<20;i++) {
      const instances=chunk.instances[i].filter(p=>!this.nav.suppressed.has(p.id));if(!instances.length)continue;
      const lod=this.quality==='alta'?0:this.quality==='media'?1:2,prototype=this.prototypes[i][Math.min(lod,this.prototypes[i].length-1)];
      const mesh=new THREE.InstancedMesh(prototype.geometry,prototype.material,instances.length),dummy=new THREE.Object3D();
      instances.forEach((p,j)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.y=p.yaw;dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(j,dummy.matrix);});mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
      if(this.waterPrototypes[i]){const water=new THREE.InstancedMesh(this.waterPrototypes[i],paintedWaterMaterial(this.pack.profile.colors.water,this.state.biome==='volcanes',this.nav.field.seed,[x0,z0,x0+48,z0+48]),instances.length);water.instanceMatrix.copy(mesh.instanceMatrix);water.receiveShadow=true;water.userData.nativeFluid='asset';group.add(water);}
    }
    return group;
  }
  syncChunks(force=false) {
    if(!this.nav||!this.prototypes)return;
    const cx=Math.floor((this.controls.target.x+24)/48),cz=Math.floor((this.controls.target.z+24)/48),range=this.quality==='alta'?2:1;
    const desired=new Set();for(let dz=-range;dz<=range;dz++)for(let dx=-range;dx<=range;dx++)desired.add(`${cx+dx},${cz+dz}`);
    for(const [key,group] of this.chunks)if(force||!desired.has(key)){this.scene.remove(group);group.traverse(o=>{if(o.isInstancedMesh){o.dispose();if(o.userData.nativeFluid==='asset'&&o.material!==this.fluidMaterial)o.material.dispose();return;}if(o.isMesh){o.geometry.dispose();if(o.material!==this.fluidMaterial)o.material.dispose();}});this.terrainMeshes=this.terrainMeshes.filter(o=>o.parent!==group);this.chunks.delete(key);this.handStaticBoxes=null;}
    for(const key of desired)if(!this.chunks.has(key)){const [x,z]=key.split(',').map(Number),group=this.terrain(x,z);this.chunks.set(key,group);this.scene.add(group);this.handStaticBoxes=null;}
  }
  villageMesh(village) {
    const group=new THREE.Group();
    for(const original of this.villageTemplates.get(village.culture)??this.villagePrototypes){const mesh=original.clone(),u=mesh.userData.unit,layout=village.buildings.find(b=>b.key===u.key);if(!layout)continue;mesh.scale.setScalar(16);mesh.position.set(village.x,this.nav.field.surface(layout.x,layout.z)-u.min[1]*16+.018,village.z);group.add(mesh);}
    return group;
  }
  async ensureBuilding(culture){if(!this.buildingTemplates.has(culture)){const descriptor=this.buildingCatalogue.find(b=>b.culture===culture);if(!descriptor)throw new Error('Casa DEST desconocida: '+culture);this.buildingTemplates.set(culture,await this.assets.building(descriptor));}}
  async ensureVillage(culture,payload) {await this.ensureBuilding(culture);if(!this.villageTemplates.has(culture))this.villageTemplates.set(culture,await this.assets.village(payload));}
  showVillagePreview(preview) {
    this.clearVillagePreview();this.villagePreview=this.villageMesh(preview);
    this.villagePreview.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.45;o.material.depthWrite=false;o.material.color.set(preview.valid?'#d4f3c2':'#f4a198');}});this.scene.add(this.villagePreview);
  }
  clearVillagePreview() {if(this.villagePreview){this.villagePreview.traverse(o=>{if(o.isMesh)o.material.dispose();});this.scene.remove(this.villagePreview);this.villagePreview=null;}}
  centerMesh(entity) {
    const culture=centerCulture(entity,this.state);
    return new NativeBuilding(this.buildingTemplates.get(culture),entity,this.destructionPass,this.state.elapsed);
  }
  async actor(entity,type) {
    const fragment=type==='worker'?profileSources[entity.profile]:animalSources[entity.species];const descriptor=type==='worker'?this.workerLibraries[entity.profile]:this.models.find(m=>m.source.includes(fragment));
    if(!descriptor)return;
    const gltf=await this.assets.model(descriptor.url);if(!this.state||!this.objects.has(entity.id))return;
    const root=this.objects.get(entity.id),model=clone(gltf.scene);model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});
    // Native bestiary labs use unit scale. Their heroic dimensions are already
    // authored in the GLB; animated foot grounding follows in applyAnimalPose.
    if(type==='animal')prepareAnimalModel(model,entity.species);
    root.add(model);
    const mixer=new THREE.AnimationMixer(model);this.mixers.set(entity.id,{mixer,clips:type==='animal'?prepareAnimalClips(gltf.animations):gltf.animations,action:null,name:null,model,
      groundSamples:type==='animal'?animalGroundSamples(model):null});
  }
  async crate(entity){
    const gltf=await this.assets.model(this.workerLibraries[entity.profile??'olderMale'].url);
    if(!this.state||!this.objects.has(entity.id))return;
    const model=nativeCrate(gltf);model.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});this.objects.get(entity.id).add(model);
  }
  updateActor(entity,dt,type) {
    const data=this.mixers.get(entity.id);if(!data)return;
    if(type==='worker'){
      applyWorkerPose(data,entity,this.state.tasks.find(t=>t.id===entity.taskId),this.state.elapsed,this.workerLibraries[entity.profile]);
      if(entity.path?.length){const next=entity.path[0];this.objects.get(entity.id).rotation.y=Math.atan2(next.x-entity.x,next.z-entity.z);}
      return;
    }
    applyAnimalPose(data,entity,this.state.elapsed);
    this.objects.get(entity.id).rotation.y=entity.heading??0;
    if(entity.path?.length){const next=entity.path[0];this.objects.get(entity.id).rotation.y=Math.atan2(next.x-entity.x,next.z-entity.z);}
  }
  sync(dt) {
    const s=this.state;if(!s||!this.cropModels)return;
    const desired=new Set();
    for(const v of s.villages){desired.add(v.id);if(!this.objects.has(v.id)){const mesh=this.villageMesh(v);this.objects.set(v.id,mesh);this.scene.add(mesh);}}
    const visiblePlants=s.plants.filter(p=>p.alive&&Math.hypot(p.x-this.controls.target.x,p.z-this.controls.target.z)<140);
    if(visiblePlants.length>this.cropBatch.capacity){this.cropBatch.dispose();this.cropBatch=createCropBatch(this.scene,this.renderer,this.cropGltf,this.cropBridgeData,2**Math.ceil(Math.log2(visiblePlants.length)));}
    this.cropBatch.update(visiblePlants,s.elapsed,(x,z)=>this.nav.field.surface(x,z));
    for(const e of [...s.structures,...s.crates.filter(c=>!c.delivered),...s.workers,...(s.raid?.animals.filter(a=>a.status!=='gone')??[]),...s.spells]) {
      desired.add(e.id);let mesh=this.objects.get(e.id);
      if(!mesh) {
        if(e.kind==='center')mesh=this.centerMesh(e);
        else if(e.kind==='wall')mesh=new NativeWall(this.wallPrototypes,e);
        else if(e.species&&'growth' in e)mesh=new THREE.Group();
        else if('value' in e){mesh=new THREE.Group();this.objects.set(e.id,mesh);this.crate(e).catch(error=>this.onError?.(error));}
        else if('profile' in e||'hitsRemaining' in e) {mesh=new THREE.Group();this.objects.set(e.id,mesh);this.actor(e,'profile' in e?'worker':'animal').catch(error=>this.onError?.(error));}
        else if(e.kind==='shield')mesh=new THREE.Group();
        else mesh=new THREE.Group();
      mesh.userData.entityId=e.id;this.objects.set(e.id,mesh);this.scene.add(mesh);
      }
      mesh.position.set(e.x,this.nav.field.surface(e.x,e.z)+.025,e.z);
      if('value' in e)mesh.visible=!e.carrierId;
      if('profile' in e&&!('value' in e))mesh.visible=e.status!=='home';
      if(e.kind==='wall'){mesh.rotation.y=e.yaw;mesh.update(e,dt);}
      else if(e.kind==='center')mesh.update(e,s.elapsed);
      if(e.species&&'growth' in e) {
        const growth=e.growth/cropSpec(e.species).growth_seconds,stage=growth>=1?4:Math.max(0,marks.findIndex(m=>growth<m)-1),key=`${cropIds.indexOf(e.species)}:${stage}`;
        if(mesh.userData.stageKey!==key){mesh.clear();mesh.add(this.cropModels[cropIds.indexOf(e.species)*5+stage].clone());mesh.userData.stageKey=key;}
        if(growth<.065){const amount=Math.max(.06,growth/.065);mesh.scale.set(.4+.6*amount,amount,.4+.6*amount);}else mesh.scale.set(1,1,1);
      }
      if(!('value' in e)&&('profile' in e||'hitsRemaining' in e))this.updateActor(e,dt,'profile' in e?'worker':'animal');
    }
    for(const [id,mesh] of this.objects)if(!desired.has(id)){this.scene.remove(mesh);if(mesh.userData.nativeWall||mesh.userData.nativeBuilding)mesh.dispose();this.objects.delete(id);this.mixers.delete(id);}
    const night=s.time>=300,tint=night?'#263747':this.pack.profile.bg;
    this.renderer.setClearColor(tint);this.scene.fog=new THREE.Fog(tint,130,250);this.destructionPass.night=skyNight(s);this.destructionPass.nightLight=1.12;this.sun.intensity=3-2.6*this.destructionPass.night;this.ambient.intensity=2-.9*this.destructionPass.night;
    this.sun.position.set(this.controls.target.x-30,this.controls.target.y+55,this.controls.target.z+25);this.sun.target.position.copy(this.controls.target);
  }
  pick(event) {
    const rect=this.canvas.getBoundingClientRect();this.cursor.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.cursor,this.camera);
    const hits=this.raycaster.intersectObjects([...this.objects.values()],true);
    let entityId=null;for(const hit of hits){let object=hit.object;while(object&&!object.userData.entityId)object=object.parent;if(object){entityId=object.userData.entityId;break;}}
    let closest=hits[0]?.distance??Infinity;const point=new THREE.Vector3(),box=new THREE.Box3();
    for(const plant of this.state.plants.filter(p=>p.alive)) {
      const y=this.nav.field.surface(plant.x,plant.z),sample=this.cropBatch.sample(plant.species,plant.growth),radius=plant.species==='platano'?.65:.45;
      box.min.set(plant.x-radius,y,plant.z-radius);box.max.set(plant.x+radius,y+Math.max(.16,sample.height),plant.z+radius);
      if(this.raycaster.ray.intersectBox(box,point)){const distance=point.distanceTo(this.raycaster.ray.origin);if(distance<closest){closest=distance;entityId=plant.id;}}
    }
    const ground=this.raycaster.intersectObjects(this.terrainMeshes,false)[0];return {entityId,point:ground?{x:ground.point.x,z:ground.point.z}:null};
  }
  handColliders(config){
    const boxes=[],box=new THREE.Box3(),matrix=new THREE.Matrix4();
    const add=(bounds,id,list=boxes)=>{if(!bounds.isEmpty())list.push({id,min:bounds.min.toArray(),max:bounds.max.toArray()});};
    if(!this.handStaticBoxes){
      this.handStaticBoxes=[];
      for(const [key,group] of this.chunks){group.updateMatrixWorld(true);group.traverse(mesh=>{
        if(!mesh.isInstancedMesh||mesh.userData.nativeFluid)return;mesh.geometry.computeBoundingBox();
        for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);box.copy(mesh.geometry.boundingBox).applyMatrix4(matrix);add(box,`${key}:prop:${mesh.id}:${i}`,this.handStaticBoxes);}
      });}
    }
    boxes.push(...this.handStaticBoxes);
    const ids=[...this.state.villages,...this.state.structures].map(e=>e.id);
    for(const id of ids){const root=this.objects.get(id);if(!root)continue;root.updateMatrixWorld(true);root.traverse(mesh=>{
      if(!mesh.isMesh)return;
      // Village draw ranges share a buffer containing every building. Its
      // complete geometry box would incorrectly enclose the whole village.
      const unit=mesh.userData.unit;
      if(unit)box.set(new THREE.Vector3(...unit.min),new THREE.Vector3(...unit.max)).applyMatrix4(mesh.matrixWorld);
      else {mesh.geometry.computeBoundingBox();box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);}
      add(box,id+':'+mesh.id);
    });}
    const points=config.route??[config.position],radius=3;
    const loX=Math.min(...points.map(p=>p[0]))-radius,hiX=Math.max(...points.map(p=>p[0]))+radius,loZ=Math.min(...points.map(p=>p[2]))-radius,hiZ=Math.max(...points.map(p=>p[2]))+radius;
    return boxes.filter(b=>b.max[0]>=loX&&b.min[0]<=hiX&&b.max[2]>=loZ&&b.min[2]<=hiZ);
  }
  updateHands(dt){
    if(!this.hands)return;
    const step=this.state.tutorial.step,key=step+':'+this.nav.version;
    let config=null;
    if(this.state.day===1&&!this.state.result&&step!=='done'){
      if(['observe','harvest'].includes(step))config=tutorialHandTarget(this.state,this.nav);
      else {if(this.handTargetKey!==key){this.handTargetKey=key;this.handTargetCache=tutorialHandTarget(this.state,this.nav);}config=this.handTargetCache;}
    }
    this.hands.show(config,config?this.handColliders(config):[]);this.hands.update(dt,this.camera);
  }
  render(dt) {this.controls.update();this.syncChunks();const simulated=Math.max(0,this.state.elapsed-this.simElapsed);this.simElapsed=this.state.elapsed;this.sync(simulated);this.updateHands(dt);this.workVfx?.update(this.state);this.attackVfx?.update(this.state);this.shieldVfx?.update(this.state);this.agricultureVfx?.update(this.state);this.materialVfx?.update(this.state);this.locomotionVfx?.update(this.state,this.objects);this.destructionPass.render(this.camera,this.scene);const workDepth=!!this.workVfx?.prepare(this.camera),attackDepth=!!this.attackVfx?.prepare(this.camera),shieldDepth=!!this.shieldVfx?.prepare(this.camera),agricultureDepth=!!this.agricultureVfx?.prepare(this.camera),materialDepth=!!this.materialVfx?.prepare(this.camera),locomotionDepth=!!this.locomotionVfx?.prepare(this.camera),depth=workDepth||attackDepth||shieldDepth||agricultureDepth||materialDepth||locomotionDepth;if(depth)this.destructionPass.captureDepth(this.camera,this.scene);this.toon.update(skyNight(this.state),this.sun,this.state.biome);this.toon.apply(this.scene);this.scene.traverse(o=>{for(const m of o.isMesh?(Array.isArray(o.material)?o.material:[o.material]):[]){if(m.userData.paintUniforms)m.userData.paintUniforms.uTime.value=waterTime(this.state.elapsed);}});const autoClear=this.renderer.autoClear;try{this.renderer.autoClear=false;this.renderer.clear();this.sky.render(this.renderer,this.camera,this.state);this.renderer.render(this.scene,this.camera);}finally{this.renderer.autoClear=autoClear;}this.destructionPass.renderSmoke(this.camera,this.scene,{depthPrepared:depth});}
  dispose() {this.sky.dispose();this.workVfx?.dispose();this.attackVfx?.dispose();this.shieldVfx?.dispose();this.agricultureVfx?.dispose();this.materialVfx?.dispose();this.locomotionVfx?.dispose();this.vfxLibrary?.dispose();this.wallDrawing.dispose();this.strokeLine.geometry.dispose();this.strokeLine.material.dispose();this.clearWallPreview();this.hands?.dispose();this.destructionPass.dispose();for(const template of this.buildingTemplates.values())template.dispose();this.resizeObserver.disconnect();this.controls.dispose();this.scene.traverse(o=>{if(o.isMesh){if(o.isInstancedMesh)o.dispose();if(o.userData.nativeFluid!=='asset')o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{if(m!==this.fluidMaterial)m.dispose();});}});this.waterPrototypes?.forEach(g=>g?.dispose());this.fluidMaterial?.dispose();this.renderer.dispose();this.state=null;}

}
