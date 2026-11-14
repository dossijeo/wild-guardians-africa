import {Material} from 'three';
import {Node,NodeMaterial} from 'three/webgpu';
import {getNodeChildren} from 'three/src/nodes/core/NodeUtils.js';

// Change notifications are attached once, never discovered in the draw loop.
// Shared nodes/textures can notify multiple material owners without changing
// their identities. Removing the final subscriber restores the descriptor.
const observed=new WeakMap();
function observe(object,key,notify){
 let properties=observed.get(object);if(!properties)observed.set(object,properties=new Map());
 let record=properties.get(key);
 if(!record){
  const own=Object.getOwnPropertyDescriptor(object,key);let descriptor=own;
  for(let p=Object.getPrototypeOf(object);!descriptor&&p;p=Object.getPrototypeOf(p))descriptor=Object.getOwnPropertyDescriptor(p,key);
  if(!descriptor){if(!Object.isExtensible(object))return null;descriptor={value:undefined,writable:true};}
  if(!own&&!Object.isExtensible(object)||own?.configurable===false||('value'in descriptor&&!descriptor.writable)||descriptor.get&&!descriptor.set)return null;
  let value=descriptor.value,assigned=false;const subscribers=new Set(),read=descriptor.get?()=>descriptor.get.call(object):()=>value;
  const get=()=>read(),set=next=>{assigned=true;const before=read();if(descriptor.set)descriptor.set.call(object,next);else value=next;const after=read();if(!Object.is(before,after))for(const callback of [...subscribers])callback(after,before);};
  Object.defineProperty(object,key,{configurable:true,enumerable:own?.enumerable??false,get,set});
  record={subscribers,get,set,restore(){const current=Object.getOwnPropertyDescriptor(object,key);if(current?.get!==get||current?.set!==set)return;if(own)Object.defineProperty(object,key,'value'in own?{...own,value}:own);else if(assigned&&'value'in descriptor)Object.defineProperty(object,key,{value,writable:true,configurable:true,enumerable:true});else delete object[key];}};properties.set(key,record);
 }
 record.subscribers.add(notify);return ()=>{record.subscribers.delete(notify);if(!record.subscribers.size){record.restore();properties.delete(key);}};
}
const ignored=/^(is[A-Z]|_)|^(visible|version|uuid|name|opacity|userData)$/;
const admissionTextureKeys=['type','compareFunction','colorSpace','channel','anisotropy','renderTarget','isCubeTexture','isArrayTexture','isDataArrayTexture','isCompressedArrayTexture','is3DTexture','isData3DTexture','isDepthTexture','isDataTexture'];
const samplerKeys=['mapping','magFilter','minFilter','wrapS','wrapT','wrapR'];
const shape=value=>value===null?'null':typeof value==='number'?value!==0:typeof value==='object'?'object':String(value);
const valueToken=value=>JSON.stringify(value?.isNode?['node',value.id,value.version]:value?.isTexture?['texture',...samplerKeys.map(name=>String(value[name]))]:[typeof value,shape(value)]);

// Canonical persistent binary tuples give a collision-free identity to the
// structural state. An assignment updates one leaf and O(log fields) parents;
// switching back to a known state restores its identity without rereading the
// material. Bound interning memory; a reset just retires cached variants.
function structuralIdentity(values,onReset){
 const size=2**Math.ceil(Math.log2(Math.max(1,values.length))),tree=new Array(size*2),intern=new Map();let serial=0;
 const node=key=>{let value=intern.get(key);if(!value){value={id:++serial};intern.set(key,value);}return value;};
 const parent=i=>node('b:'+tree[i*2].id+':'+tree[i*2+1].id);
 function rebuild(){intern.clear();for(let i=0;i<size;i++)tree[size+i]=node('l:'+String(values[i]));for(let i=size-1;i>0;i--)tree[i]=parent(i);}
 rebuild();
 return {key:()=>tree[1],set(index,value){if(values[index]===value)return;values[index]=value;let i=size+index;tree[i]=node('l:'+value);while((i=Math.floor(i/2))>0)tree[i]=parent(i);if(intern.size>8192){onReset();rebuild();}}};
}

export function createStableMaterialKeys({audit=false}={}){
 const records=new WeakMap(),admissionSnapshots=new WeakMap(),live=new Set();let closed=false,builds=0,hits=0,fallbacks=0,discoveries=0;
 function admissionSnapshot(material,build){const value=build(),old=admissionSnapshots.get(material);if(old&&old.length===value.length&&old.every((v,i)=>Object.is(v,value[i])))return old;admissionSnapshots.set(material,value);return value;}
 function release(record,clearSnapshot=true){if(clearSnapshot)admissionSnapshots.delete(record.material);for(const stop of record.dependencies.splice(0))stop();for(const stop of record.properties.splice(0))stop();record.material.removeEventListener('dispose',record.dispose);live.delete(record);records.delete(record.material);}
 function adopt(material){
  const record={material,properties:[],dependencies:[],dirty:true,bindingsDirty:true,admissionDirty:true,admissionValue:null,key:null,unsupported:false,variants:new Map()};
  // Unsupported dependencies remain on the reference path until re-admission.
  const invalidate=()=>{record.dirty=true;};
  const keys=new Set(Object.keys(material));for(let p=Object.getPrototypeOf(material);p;p=Object.getPrototypeOf(p))for(const [key,d]of Object.entries(Object.getOwnPropertyDescriptors(p)))if(d.get&&!ignored.test(key))keys.add(key);
  record.recipe=[...keys].filter(key=>!ignored.test(key));keys.add('version');
  const indices=new Map(record.recipe.map((key,i)=>[key,i]));record.identity=structuralIdentity(record.recipe.map(key=>valueToken(material[key])),()=>record.variants.clear());
  record.refresh=(key,value)=>{record.admissionDirty=true;const index=indices.get(key);if(index!==undefined)record.identity.set(index,valueToken(value));};
  discoveries++;record.nodeProperties=new Set();record.textureProperties=new Set();
  for(const {property,index} of getNodeChildren(material)){
   // Collections and non-recipe roots have no assignment/version contract.
   if(index!==undefined||!record.recipe.includes(property))return null;
   record.nodeProperties.add(property);
  }
  for(const key of record.recipe)if(material[key]?.isTexture)record.textureProperties.add(key);
  for(const key of keys){if(ignored.test(key)&&key!=='version')continue;
   const stop=observe(material,key,(after,before)=>{record.refresh(key,after);if(before?.isNode||after?.isNode||before?.isTexture||after?.isTexture){if(after?.isNode)record.nodeProperties.add(key);if(after?.isTexture)record.textureProperties.add(key);record.bindingsDirty=true;invalidate();}else if(key==='version'||key==='customProgramCacheKey'||key==='onBeforeCompile'||typeof before!==typeof after||shape(before)!==shape(after))invalidate();
    // A replacement collection may contain new dependencies. Its owner must
    // re-admit it; until then use Three's authoritative discovery path.
    if(after&&(Array.isArray(after)||Object.getPrototypeOf(after)===Object.prototype))record.collectionChanged=true;
   });
   if(!stop){for(const fn of record.properties)fn();return null;}record.properties.push(stop);
  }
  record.dispose=()=>release(record);material.addEventListener('dispose',record.dispose);records.set(material,record);live.add(record);return record;
 }
 function dependencies(record){
  for(const stop of record.dependencies.splice(0))stop();
  // Node.getCacheKey itself caches descendants by the direct root's version.
  // Scriptable/custom key implementations may have other dependencies and
  // therefore retain Three's ordinary path.
  for(const property of record.nodeProperties){
   const childNode=record.material[property];if(!childNode?.isNode)continue;
   if(childNode.getCacheKey!==Node.prototype.getCacheKey)return false;
   const stop=observe(childNode,'version',()=>{record.refresh(property,childNode);record.dirty=true;});if(!stop)return false;record.dependencies.push(stop);
  }
  for(const key of record.textureProperties){const texture=record.material[key];if(!texture?.isTexture)continue;for(const property of [...samplerKeys,...admissionTextureKeys]){const stop=observe(texture,property,()=>{record.admissionDirty=true;if(property==='renderTarget')record.bindingsDirty=true;if(samplerKeys.includes(property)){record.refresh(key,texture);record.dirty=true;}});if(!stop)return false;record.dependencies.push(stop);}if(texture.renderTarget){const stop=observe(texture.renderTarget,'samples',()=>{record.admissionDirty=true;});if(!stop)return false;record.dependencies.push(stop);}}
  return true;
 }
 return {
  admissionInputs(material,build){
   if(closed)throw Error('Material key owner disposed');
   const method=material.customProgramCacheKey;if(method!==NodeMaterial.prototype.customProgramCacheKey&&method!==Material.prototype.customProgramCacheKey)return admissionSnapshot(material,build);
   const record=records.get(material)??adopt(material);if(!record||record.unsupported||record.collectionChanged)return admissionSnapshot(material,build);
   if(record.bindingsDirty){record.bindingsDirty=false;if(!dependencies(record)){record.unsupported=true;return admissionSnapshot(material,build);}}
   if(record.admissionDirty){record.admissionDirty=false;record.admissionValue=admissionSnapshot(material,build);}
   if(audit){const reference=build();if(reference.length!==record.admissionValue.length||reference.some((v,i)=>!Object.is(v,record.admissionValue[i])))throw Error('Stable admission inputs differ');}
   return record.admissionValue;
  },
  get(material,build){
   if(closed)throw Error('Material key owner disposed');
   const method=material.customProgramCacheKey;
   if(method!==NodeMaterial.prototype.customProgramCacheKey&&method!==Material.prototype.customProgramCacheKey){fallbacks++;return build();}
   const record=records.get(material)??adopt(material);if(!record){fallbacks++;return build();}
   if(record.unsupported||record.collectionChanged){fallbacks++;return build();}
   if(record.dirty){
    record.dirty=false;
    if(record.bindingsDirty){record.bindingsDirty=false;if(!dependencies(record)){record.unsupported=true;for(const stop of record.dependencies.splice(0))stop();fallbacks++;return build();}}
    // This recipe is captured once. Only a structural notification reaches
    // here; no property/prototype/graph discovery occurs on stable draws.
    // Shadow overrides revisit existing configurations for different objects.
    const signature=record.identity.key();
    if(record.variants.has(signature)){record.key=record.variants.get(signature);hits++;}
    else{record.key=build();builds++;if(record.variants.size>=128)record.variants.delete(record.variants.keys().next().value);record.variants.set(signature,record.key);}
   }else hits++;
   if(audit&&record.key!==build())throw Error('Stable material key differs from Three.js: '+material.type+' '+material.name);
   return record.key;
  },
  // Owners adding a public structural field or editing a nested graph in
  // place must invalidate explicitly, just as they must request admission.
  invalidate(material){const record=records.get(material);if(record)release(record,false);},
  status(){return {materials:live.size,builds,hits,fallbacks,discoveries};},
  dispose(){if(closed)return;closed=true;for(const record of [...live])release(record);}
 };
}
