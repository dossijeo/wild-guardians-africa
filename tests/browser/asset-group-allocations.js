// QA only: attribute group churn without changing capacity, packing or drawing.
// Instance-array bytes are CPU backing-store sizes, not physical GPU memory.
export function assetGroupDrawSnapshot(groups){
 return [['color',groups.colors],['shadow',groups.shadows]].flatMap(([pass,cache])=>[...cache].sort(([a],[b])=>a.localeCompare(b)).map(([key,g])=>{
  const m=g.mesh,v=m.geometry.attributes.nativeVisibility;
  return {pass,key,capacity:g.capacity,count:m.count,matrices:Array.from(m.instanceMatrix.array.subarray(0,m.count*16)),coverage:v?Array.from(v.array.subarray(0,m.count)):null,castShadow:m.castShadow,receiveShadow:m.receiveShadow,indexCount:m.geometry.index?.count??null,attributes:Object.fromEntries(Object.entries(m.geometry.attributes).filter(([name])=>name!=='nativeVisibility').map(([name,a])=>[name,{count:a.count,itemSize:a.itemSize,normalized:a.normalized,type:a.array.constructor.name}]))};
 }));
}

export class AssetGroupAllocations {
 constructor(groups){
  this.groups=groups;this.frame=null;this.hooks=[];const thisProbe=this;
  try{
   this.hook('prepare',function(original,args){
    if(!thisProbe.frame)return original.apply(this,args);
    const [cache,key,entries,pass]=args,before=cache.get(key);
    let failed=true;
    try{const result=original.apply(this,args);failed=false;return result;}
    finally{if(thisProbe.frame){const after=cache.get(key);thisProbe.frame.prepares.push({key,pass,requestedInstances:entries.reduce((n,e)=>n+e.mesh.count,0),previousCapacity:before?.capacity??null,capacity:after?.capacity??null,newMesh:!!after&&after.mesh!==before?.mesh,instanceArrayBytes:after?(after.mesh.instanceMatrix.array.byteLength+(pass==='color'?(after.mesh.geometry.attributes.nativeVisibility?.array.byteLength??0):0)):0,failed});}}
   });
   this.hook('retire',function(original,args){
    if(!thisProbe.frame)return original.apply(this,args);
    const [cache,key]=args,before=cache.get(key);
    const result=original.apply(this,args);
    if(thisProbe.frame)thisProbe.frame.retired.push({key,pass:before?.pass,capacity:before?.capacity,instances:before?.mesh.count});
    return result;
   });
  }catch(error){this.dispose();throw error;}
 }
 hook(name,observe){
  const target=this.groups,original=target[name],owned=Object.hasOwn(target,name);
  if(typeof original!=='function')throw Error('Missing asset-group method '+name);
  const wrapped=function(...args){return observe.call(this,original,args);};
  target[name]=wrapped;this.hooks.push({name,original,owned,wrapped});
 }
 begin(){if(this.frame)throw Error('Nested asset-group allocation probe');this.frame={prepares:[],retired:[]};}
 end(){const result=this.frame;this.frame=null;return result;}
 dispose(){this.frame=null;for(const {name,original,owned,wrapped} of this.hooks.reverse())if(this.groups[name]===wrapped){if(owned)this.groups[name]=original;else delete this.groups[name];}this.hooks=[];}
}
