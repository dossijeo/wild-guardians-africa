import * as THREE from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {acos,atan,cameraPosition,clamp,cross,dFdx,dFdy,dot,float,length,max,mix,normalize,normalWorld,positionWorld,pow,reflect,sRGBTransferOETF,shadow,smoothstep,texture,uniform,vec2,vec3,vec4} from 'three/tsl';
import {assetUrl} from './asset-url.js';
import {skyNight} from './sky.js';
import {mangroveGroundRecipe} from './webgpu-material-graph-catalog.js';
import {prepareWebGpuTexture} from './webgpu-texture-upload.js';
import {hashCell} from '../world/terrain.js';

// BiomeGround uses the native terrain view's low 32-bit seed, not TerrainField's string hash.
export function mangroveGroundSeed(seed){const value=Number(seed)>>>0;return new THREE.Vector2(hashCell(value,0,1,417)/4294967296,hashCell(value,1,0,417)/4294967296);}

// Preserve the terrain fallback if a texture or provider cannot be prepared.
// Aborted world startup must still terminate instead of reporting a fallback.
export async function initializeMangroveGround({create,state,signal,onError=()=>{}}={}){
 if(typeof create!=='function'||typeof onError!=='function')throw TypeError('Invalid mangrove ground initialization');
 let ground=null;
 try{ground=await create();ground.update(state);return {ground,error:null};}
 catch(error){ground?.dispose();if(signal?.aborted)throw error;onError(error);return {ground:null,error:String(error?.message??error)};}
}

// Default mangrove pure-moss branch of groundMaterial417 and its direct/ambient
// biome-ground light. Contact AO and the independently authored mud are still
// pending; keep this provider experimental until in-game visual comparison.
export async function createWebGpuMangroveGround({signal,fetchImpl=globalThis.fetch,imageLoader=null,renderer=null,light=null,shadows=false,shadowNode=null,environment=null}={}){
 if(renderer!==null&&(!renderer?.backend?.isWebGPUBackend||typeof renderer.initTexture!=='function'||typeof renderer.backend.device?.queue?.onSubmittedWorkDone!=='function')||imageLoader!==null&&typeof imageLoader!=='function'||shadowNode!==null&&(!shadows||!light||!shadowNode.isShadowNode||shadowNode.light!==light)||environment!==null&&(!environment.day?.isTextureNode||!environment.dark?.isTextureNode||!environment.blend?.isNode||!environment.night?.isNode))throw TypeError('Invalid ground image loader, renderer, shadow node or environment');
 const response=await fetchImpl(assetUrl('/content/ground-materials.json'),{signal});if(!response.ok)throw Error('Ground material catalogue unavailable');const tile=(await response.json()).mangrove;
 if(!tile?.base||!tile.normal||!tile.arh||!Number.isFinite(tile.scale))throw Error('Invalid mangrove ground material');
 const bitmaps=[],atlases=[];let closed=false,lastSeed;
 try{for(const url of [tile.base,tile.normal,tile.arh]){let bitmap;if(imageLoader)bitmap=await imageLoader(assetUrl(url),{signal});else{const image=await fetchImpl(assetUrl(url),{signal});if(!image.ok)throw Error('Mangrove ground texture unavailable');bitmap=await createImageBitmap(await image.blob());}if(signal?.aborted){bitmap.close();throw new DOMException('Ground load cancelled','AbortError');}const atlas=new THREE.Texture(bitmap);atlas.wrapS=atlas.wrapT=THREE.RepeatWrapping;atlas.minFilter=THREE.LinearMipmapLinearFilter;atlas.magFilter=THREE.LinearFilter;atlas.generateMipmaps=true;atlas.flipY=false;atlas.needsUpdate=true;if(renderer)await prepareWebGpuTexture({renderer,texture:atlas,signal,release(){atlas.dispose();bitmap.close();}});bitmaps.push(bitmap);atlases.push(atlas);}}
 catch(error){for(const atlas of atlases)atlas.dispose();for(const bitmap of bitmaps)bitmap.close();throw error;}
 const night=uniform(0),seed=uniform(new THREE.Vector2()),sunDirection=uniform(new THREE.Vector3(-.82,.52,.31).normalize()),visibility=shadows&&light?(shadowNode??shadow(light)).r:float(1);
 const world=positionWorld,uv=vec2(world.x.mul(.8).add(world.z.mul(.6)),world.x.mul(-.6).add(world.z.mul(.8))).mul(tile.scale).add(seed),tex=texture(atlases[0],uv).rgb.mul(vec3(1,1.03,.96)),mapN=texture(atlases[1],uv).rgb.mul(2).sub(1),arh=texture(atlases[2],uv).rgb;
 const geometric=normalize(normalWorld),tangent=normalize(vec3(.8,0,.6).sub(geometric.mul(dot(vec3(.8,0,.6),geometric)))),bitangent=normalize(cross(geometric,tangent)),fade=smoothstep(.12,.60,max(length(dFdx(world)),length(dFdy(world)))).oneMinus(),normal=normalize(tangent.mul(mapN.x.mul(tile.normalBoost).mul(fade)).add(bitangent.mul(mapN.y.mul(tile.normalBoost).mul(fade))).add(geometric.mul(max(mapN.z,.08))));
 const albedo=pow(max(tex,vec3(0)),2.2),rough=clamp(arh.g,.5,.99),ao=mix(.45,1,arh.r),view=normalize(cameraPosition.sub(world)),half=normalize(view.add(sunDirection)),nv=max(dot(normal,view),.015),nl=max(dot(normal,sunDirection),0),nh=max(dot(normal,half),0),a=max(.045,rough.mul(rough)),a2=a.mul(a),den=nh.mul(nh).mul(a2.sub(1)).add(1),distribution=a2.div(max(den.mul(den).mul(Math.PI),.0001)),k=rough.add(1).mul(rough.add(1)).mul(.125),geometry=nv.div(nv.mul(k.oneMinus()).add(k)).mul(nl.div(nl.mul(k.oneMinus()).add(k))),fresnel=vec3(.04).add(vec3(.96).mul(pow(clamp(dot(half,view),0,1).oneMinus(),5))),brdf=fresnel.oneMinus().mul(albedo).div(Math.PI).add(fresnel.mul(distribution).mul(geometry).div(max(nv.mul(max(nl,.001)).mul(4),.001))).mul(nl);
 const sun=mix(vec3(3.65,3.30,2.78),vec3(.22,.36,.66).mul(1.12),night),ambient=mix(vec3(.55,.63,.67),vec3(.095,.17,.32).mul(1.12),night);let lit=brdf.mul(sun).mul(visibility).mul(mix(.48,1,ao)).add(albedo.mul(ambient).mul(ao).mul(clamp(normal.y,0,1).mul(.24).add(.76)));
 if(environment){const direction=normalize(reflect(view.negate(),normal)),envUv=vec2(atan(direction.z,direction.x).div(2*Math.PI).add(.5),acos(clamp(direction.y,-1,1)).div(Math.PI)),day=environment.day.sample(envUv).level(rough.mul(7)).rgb.mul(4),dark=environment.dark.sample(envUv).level(rough.mul(7)).rgb.mul(4).add(vec3(.025,.045,.10)),reflection=mix(day,dark,night).mul(environment.blend),groundFresnel=pow(float(1).sub(clamp(dot(normal,view),0,1)),5).mul(.96).add(.04);lit=lit.add(reflection.mul(groundFresnel).mul(float(1).sub(rough.mul(.72))).mul(.48).mul(ao));}
 const filmic=pow(clamp(lit.mul(lit.mul(2.51).add(.03)).div(lit.mul(lit.mul(2.43).add(.59)).add(.14)),0,1),1/2.2),output=vec4(sRGBTransferOETF(pow(filmic,2.2)),1);
 const recipe=mangroveGroundRecipe({textures:atlases,scale:tile.scale,normalBoost:tile.normalBoost,light,shadowNode,shadows,environment}),sharedMaterial=new MeshBasicNodeMaterial(recipe.structural.state);sharedMaterial.outputNode=output;sharedMaterial.userData.groundSeed=seed;
 return {sharedMaterial,create(payload){if(closed)throw Error('Ground provider disposed');if(!(payload.groundMask instanceof Uint8Array)||payload.groundMask.length!==35*35*4)throw TypeError('Missing confirmed ground mask');const mask=new THREE.DataTexture(payload.groundMask,35,35,THREE.RGBAFormat);mask.minFilter=mask.magFilter=THREE.LinearFilter;mask.generateMipmaps=false;mask.needsUpdate=true;const material=new MeshBasicNodeMaterial(recipe.structural.state);material.outputNode=output;material.userData.confirmedGroundMask=mask;material.addEventListener('dispose',()=>mask.dispose());return material;},update(state){if(closed)throw Error('Ground provider disposed');night.value=skyNight(state);const value=String(state.seed);if(value!==lastSeed){seed.value.copy(mangroveGroundSeed(value));lastSeed=value;}if(light)sunDirection.value.copy(light.position).sub(light.target.position).normalize();},dispose(){if(closed)return;closed=true;sharedMaterial.dispose();for(const atlas of atlases)atlas.dispose();for(const bitmap of bitmaps)bitmap.close();}};
}
