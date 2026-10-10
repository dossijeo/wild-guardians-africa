// Isolated candidate. No normal-path selection or production asset registration.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {json} from './asset-fetch.js';
const mag={9728:THREE.NearestFilter,9729:THREE.LinearFilter},min={...mag,9984:THREE.NearestMipmapNearestFilter,9985:THREE.LinearMipmapNearestFilter,9986:THREE.NearestMipmapLinearFilter,9987:THREE.LinearMipmapLinearFilter},wrap={33071:THREE.ClampToEdgeWrapping,33648:THREE.MirroredRepeatWrapping,10497:THREE.RepeatWrapping};
export class CropPartition {
 constructor(assets,manifest,url){
  this.assets=assets;this.manifest=manifest;this.base=new URL('.',new URL(url,globalThis.location?.href??'http://localhost/'));this.pending=new Map();this.textures=new Map();this.textureConfigs=new Map();this.sources=new Map();this.closed=false;
  if(manifest.version!==1||manifest.sourceRecipeVersion!==4||manifest.partitions?.length!==4||manifest.textures?.length!==6)throw Error('Incomplete crop partition manifest');
  const specs=new Set();for(const entry of manifest.partitions){const key=entry.group+':'+entry.kind;if(specs.has(key)||!['maize','remainder'].includes(entry.group)||!['steady','bridges'].includes(entry.kind)||!(entry.bytes>0))throw Error('Ambiguous crop partition');specs.add(key);this.localUrl(entry.file);}
  this.textureRecords=new Map();for(const t of manifest.textures){const uri=this.localUrl(t.uri);if(this.textureRecords.has(uri)||!(t.bytes>0))throw Error('Ambiguous crop texture');this.textureRecords.set(uri,t);}
  this.onAbort=()=>this.dispose();assets.preparation.signal.addEventListener('abort',this.onAbort,{once:true});if(assets.preparation.signal.aborted)this.dispose();
 }
 static async load(assets,url){const manifest=await json(url,{signal:assets.preparation.signal});assets.assertOpen();return new CropPartition(assets,manifest,url);}
 assertOpen(){this.assets.assertOpen();if(this.closed||this.assets.preparation.signal.aborted)throw Error('Crop partition cancelled');}
 localUrl(relative){if(typeof relative!=='string'||relative.startsWith('/')||relative.includes('..')||/^[a-z]+:/i.test(relative))throw Error('Crop partition URI must remain relative');const url=new URL(relative,this.base);if(!url.href.startsWith(this.base.href))throw Error('Crop partition URI escapes library');return url.href;}
 expectedBytes(url){for(const entry of this.manifest.partitions)if(this.localUrl(entry.file)===url)return entry.bytes;return this.textureRecords.get(url)?.bytes??null;}
 loadTexture(parser,index,source){
  this.assertOpen();const def=parser.json.textures[index],image=parser.json.images[source],uri=this.localUrl(image.uri);if(!this.textureRecords.has(uri)||image.bufferView!==undefined)throw Error('Crop partition texture is not canonical');
  const colorUses=new Set();for(const material of parser.json.materials??[]){for(const [name,slot]of [['color',material.pbrMetallicRoughness?.baseColorTexture],['color',material.emissiveTexture],['linear',material.normalTexture],['linear',material.occlusionTexture],['linear',material.pbrMetallicRoughness?.metallicRoughnessTexture]])if(slot?.index===index){if((slot.texCoord??0)!==0||slot.extensions)throw Error('Unsupported crop texture coordinate transform');colorUses.add(name);}}
  if(colorUses.size!==1)throw Error('Ambiguous crop texture color interpretation');const color=colorUses.has('color'),s=parser.json.samplers?.[def.sampler]??{},state={mag:mag[s.magFilter??9729],min:min[s.minFilter??9987],s:wrap[s.wrapS??10497],t:wrap[s.wrapT??10497]};if(Object.values(state).some(v=>v===undefined))throw Error('Unsupported crop sampler');
  const imageKey=uri+':'+color,config=JSON.stringify(state);if(this.textureConfigs.has(imageKey)&&this.textureConfigs.get(imageKey)!==config)throw Error('Conflicting crop sampler for canonical texture');this.textureConfigs.set(imageKey,config);
  const key=JSON.stringify([uri,color,state]);if(!this.textures.has(key)){
   const pending=this.assets.texture(uri,color).then(texture=>{this.assertOpen();texture.magFilter=state.mag;texture.minFilter=state.min;texture.wrapS=state.s;texture.wrapT=state.t;texture.flipY=false;texture.generateMipmaps=state.min!==THREE.NearestFilter&&state.min!==THREE.LinearFilter;return texture;});this.textures.set(key,pending);pending.catch(()=>{if(this.textures.get(key)===pending)this.textures.delete(key);});
  }
  return this.textures.get(key).then(texture=>{this.assertOpen();parser.associations.set(texture,{textures:index});return texture;});
 }
 entry(group,kind){const value=this.manifest.partitions.find(e=>e.group===group&&e.kind===kind);if(!value)throw Error('Missing crop partition');return value;}
 createLoader(){
  const state={failed:false,complete:false,owned:new Set()},adopt=resource=>{if(state.failed||this.closed||this.assets.modelsDisposed){this.assets.release(resource);return resource;}this.assets.own(resource);state.owned.add(resource);return resource;};
  const cleanup=()=>{state.failed=true;for(const resource of state.owned)this.assets.release(resource);state.owned.clear();};
  const loader=new GLTFLoader(this.assets.loader.manager).setMeshoptDecoder(MeshoptDecoder).register(parser=>({name:'WG_CROP_CANONICAL_TEXTURES',beforeRoot:()=>{
   parser.loadTextureImage=(index,source)=>this.loadTexture(parser,index,source);
   const material=parser.loadMaterial,geometry=parser.loadGeometries,assign=parser.assignFinalMaterial;
   parser.loadMaterial=function(...args){return material.apply(this,args).then(adopt);};
   parser.loadGeometries=function(...args){return geometry.apply(this,args).then(list=>{for(const item of list)adopt(item);return list;});};
   parser.assignFinalMaterial=function(...args){const result=assign.apply(this,args);for(const item of [args[0].material].flat())adopt(item);return result;};
  }}));
  const original=loader.loadAsync.bind(loader);loader.loadAsync=(...args)=>original(...args).then(gltf=>{this.assertOpen();if(state.failed)throw Error('Crop source cancelled');state.complete=true;return gltf;}).catch(error=>{cleanup();throw error;});
  return {loader,state,cleanup};
 }
 part(group,kind){
  this.assertOpen();const entry=this.entry(group,kind),url=this.localUrl(entry.file);
  const cached=this.sources.has(url);
  if(!cached){
   const source=this.createLoader();this.sources.set(url,source);
   source.promise=this.assets.model(url,source.loader).catch(error=>{if(this.sources.get(url)===source)this.sources.delete(url);throw error;});
  }
  const source=this.sources.get(url),pending=cached?this.assets.model(url,source.loader):source.promise;
  return pending.then(gltf=>{this.assertOpen();return gltf;});
 }
 once(key,run){this.assertOpen();if(!this.pending.has(key)){const promise=Promise.resolve().then(()=>{this.assertOpen();return run();});this.pending.set(key,promise);promise.catch(()=>{if(this.pending.get(key)===promise)this.pending.delete(key);});}return this.pending.get(key).then(value=>{this.assertOpen();return value;});}
 models(scope='all'){
  if(!['maize','all'].includes(scope))throw Error('Invalid crop partition scope');
  return this.once('models:'+scope,async()=>{const sources=await Promise.all((scope==='maize'?['maize']:['maize','remainder']).map(group=>this.part(group,'steady'))),scene=new THREE.Group(),ids=new Set();
   for(const gltf of sources){gltf.scene.traverse(mesh=>{if(!mesh.isMesh)return;const m=mesh.userData,id=m.cropIndex*5+m.stage-1;if(!Number.isInteger(id)||id<0||id>=40||ids.has(id)||(scope==='maize'&&id>=5))throw Error('Ambiguous crop state identity');ids.add(id);});scene.add(gltf.scene.clone(true));}
   if(ids.size!==(scope==='maize'?5:40))throw Error('Incomplete crop states');return {scene};
  });
 }
 bridges(data,scope='all'){
  if(!['maize','all'].includes(scope)||data.recipeVersion!==4||data.models?.length!==40||data.pairs?.length!==32)throw Error('Incomplete crop bridge metadata');
  return this.once('bridges:'+scope,async()=>{const sources=await Promise.all((scope==='maize'?['maize']:['maize','remainder']).map(group=>this.part(group,'bridges'))),bakedTemplates=new Map();
   for(const gltf of sources)gltf.scene.traverse(mesh=>{if(!mesh.isMesh)return;const e=mesh.userData,index=e.bridgeIndex,pair=data.pairs.find(p=>p.a===e.a&&p.b===e.b);if(!Number.isInteger(index)||index<0||index>=32||bakedTemplates.has(index)||(scope==='maize'&&index>=4)||!pair||Math.floor(e.a/5)*4+e.a%5!==index||e.b!==e.a+1)throw Error('Ambiguous crop bridge identity');bakedTemplates.set(index,mesh);});
   if(bakedTemplates.size!==(scope==='maize'?4:32))throw Error('Incomplete crop bridges');return {...data,bakedTemplates,partitionScope:scope};
  });
 }
 dispose(){if(this.closed)return;this.closed=true;this.assets.preparation.signal.removeEventListener('abort',this.onAbort);for(const source of this.sources.values()){if(!source.state.complete)source.cleanup();else source.state.owned.clear();}this.sources.clear();this.pending.clear();this.textures.clear();this.textureConfigs.clear();this.textureRecords.clear();}
}
