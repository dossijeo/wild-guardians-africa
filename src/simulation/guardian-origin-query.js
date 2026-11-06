import * as THREE from 'three';
import {CameraVolumeIndex} from '../rendering/camera-volume-index.js';
import {cameraModelVolume} from '../rendering/camera-model-volume.js';
import {planGuardianSummon} from '../rendering/guardian-summon-planner.js';
import {authoredCropHeight} from '../rendering/crop-authored-height.js';
import {cropSpec} from './rules.js';

// Read-only QA query. Scene geometry is usable only at the exact confirmed
// boundary, and incomplete data is rejected instead of inventing a cast.
function queryOrigin({state,nav,sequence,epoch,publication,camera,exclusions=[],assets,cropHeights,targetId=null,targetPoint=null,bodyScale=1,captureCropHeight=null}){
 if(!state||!nav||!Number.isSafeInteger(sequence)||typeof epoch!=='string'||!epoch||publication?.epoch!==epoch||publication?.sequence!==sequence||publication.complete!==true||!Number.isSafeInteger(publication.revision)||!Array.isArray(publication.records)||publication.records.length>8192||!(typeof targetId==='string'&&targetId||targetPoint&&Number.isFinite(targetPoint.x)&&Number.isFinite(targetPoint.z)))throw Error('Guardian geometry unavailable or stale');
 if(!camera||![camera.position,camera.quaternion,camera.projection].every(Array.isArray)||camera.position.length!==3||camera.quaternion.length!==4||camera.projection.length!==16||![...camera.position,...camera.quaternion,...camera.projection,camera.near,camera.far].every(Number.isFinite)||camera.near<=0||camera.far<=camera.near||!Array.isArray(exclusions)||exclusions.length>64||exclusions.some(r=>!r||![r.minX,r.maxX,r.minY,r.maxY].every(Number.isFinite)||r.minX>r.maxX||r.minY>r.maxY))throw Error('Invalid guardian camera');
 const required=new Map();for(const village of state.villages){if(typeof village.id!=='string'||!Array.isArray(village.buildings))throw Error('Invalid guardian village');for(let i=0;i<village.buildings.length;i++)required.set(`v:${village.id}:${i}`,'village');}for(const entity of state.structures)if(entity.kind==='center'){const id=`s:${entity.id}:center`;if(required.has(id))throw Error('Duplicate guardian structure');required.set(id,'center');}
 const index=new CameraVolumeIndex(),seen=new Set();for(const item of publication.records){if(!item||typeof item.id!=='string'||seen.has(item.id)||!['village','center','wall'].includes(item.kind))throw Error('Invalid guardian structure');seen.add(item.id);if(item.kind==='wall')continue;if(required.get(item.id)!==item.kind||!Array.isArray(item.min)||item.min.length!==3||!Array.isArray(item.max)||item.max.length!==3||!Array.isArray(item.matrix)||item.matrix.length!==16)throw Error('Incomplete guardian structures');required.delete(item.id);const box=new THREE.Box3(new THREE.Vector3(...item.min),new THREE.Vector3(...item.max));index.set(item.id,cameraModelVolume(item.id,box,new THREE.Matrix4().fromArray(item.matrix),0));}if(required.size)throw Error('Incomplete guardian structures');
 if(!Array.isArray(assets)||!cropHeights||typeof cropHeights!=='object')throw Error('Guardian authored metadata unavailable');
 const view=new THREE.PerspectiveCamera();view.position.fromArray(camera.position);view.quaternion.fromArray(camera.quaternion);view.projectionMatrix.fromArray(camera.projection);view.projectionMatrixInverse.copy(view.projectionMatrix).invert();view.near=camera.near;view.far=camera.far;view.updateMatrixWorld(true);
 const world={state,nav,camera:view,objects:new Map(),pack:{assets},guardianScreenExclusions:()=>exclusions,cropBatch:{sample:(species,growth)=>{captureCropHeight?.(species,growth);return {height:authoredCropHeight(cropHeights[species],growth/cropSpec(species).growth_seconds)};}}},planner={world,occluders:{index,sync(){}}};
 const origin=planGuardianSummon(planner,targetId,targetPoint,{bodyScale,strictProps:true});if(!origin||![origin.x,origin.y,origin.z].every(Number.isFinite))throw Error('Guardian target unavailable');return origin;
}

export function queryGuardianOrigin(options){
 if(typeof options?.targetId!=='string'||!options.targetId)throw Error('Guardian geometry unavailable or stale');
 return queryOrigin({...options,targetPoint:null,bodyScale:1});
}

// The point is computed from the current tutorial state inside the authority;
// callers cannot supply arbitrary placement targets through this interface.
export function queryGuardianTutorialOrigin(options,config,cropHeightInputs=null){
 if(!config||!Array.isArray(config.position)||config.position.length!==3||!config.position.every(Number.isFinite))throw Error('Tutorial guardian target unavailable');
 if(cropHeightInputs!==null&&!(cropHeightInputs instanceof Map))throw TypeError('Invalid tutorial crop height dependencies');
 const captureCropHeight=cropHeightInputs?(species,growth)=>{for(const p of options.state.plants)if(p.alive&&p.species===species&&p.growth===growth)cropHeightInputs.set(p.id,{id:p.id,species,growth});}:null;
 return queryOrigin({...options,targetId:null,targetPoint:{x:config.position[0],z:config.position[2]},bodyScale:1.7,captureCropHeight});
}
