import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {loadWorkerPhysicsRig} from './worker-physics-rig.js';
import {applyAuthoredContactMask} from '../rendering/beast-ground-contact.js';

// A physics world owns its bank. Only immutable geometry is shared; every
// actor retains its own hierarchy, skeleton and materials.
export function createWorkerPhysicsRigBank({load=loadWorkerPhysicsRig}={}){
 if(typeof load!=='function')throw TypeError('Invalid physics rig loader');
 const entries=new Map();let closed=false;
 function disposeTemplate(model){const resources=new Set();model.traverse(o=>{if(!o.isSkinnedMesh)return;resources.add(o.geometry);resources.add(o.skeleton);for(const m of Array.isArray(o.material)?o.material:[o.material])resources.add(m);});for(const r of resources)r?.dispose();}
 function source(species){let entry=entries.get(species);if(entry)return entry;entry={model:null,promise:null,refs:0};entry.promise=Promise.resolve().then(()=>load(species)).then(model=>{if(!model?.isObject3D)throw TypeError('Invalid physics rig');try{if(closed)throw Error('Physics rig bank disposed');model.traverse(mesh=>{if(mesh.isSkinnedMesh)applyAuthoredContactMask(mesh);});entry.model=model;return model;}catch(error){disposeTemplate(model);throw error;}}).catch(error=>{if(entries.get(species)===entry)entries.delete(species);throw error;});entries.set(species,entry);return entry;}
 return {
  async acquire(species){if(closed)throw Error('Physics rig bank disposed');const entry=source(species),template=await entry.promise;if(closed)throw Error('Physics rig bank disposed');const model=clone(template),materials=new Set(),skeletons=new Set();model.traverse(o=>{if(!o.isSkinnedMesh)return;const copy=m=>{const result=m.clone();materials.add(result);return result;};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);skeletons.add(o.skeleton);});entry.refs++;let released=false;return {model,release(){if(released)return;released=true;for(const material of materials)material.dispose();for(const skeleton of skeletons)skeleton.dispose();entry.refs--;if(closed&&entry.refs===0&&entry.model){disposeTemplate(entry.model);entry.model=null;}}};},
  dispose(){if(closed)return;closed=true;for(const entry of entries.values())if(entry.model&&entry.refs===0){disposeTemplate(entry.model);entry.model=null;}entries.clear();}
 };
}
