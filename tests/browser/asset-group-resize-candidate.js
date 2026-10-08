import {NativeAssetGroups} from '../../src/rendering/asset-groups.js';

// QA candidate. A resized color group takes ownership of the previous private
// static attribute identities. Only old visibility, instances and VAOs retire.
// Reject a transfer if the source layout/arrays differ; never share with a
// prototype, another color group or a shadow geometry.
function sameLayout(a,b){
 const names=Object.keys(a.attributes).filter(n=>n!=='nativeVisibility');
 const other=Object.keys(b.attributes).filter(n=>n!=='nativeVisibility');
 const same=(x,y)=>!x&&!y||!!x&&!!y&&x.array===y.array&&x.itemSize===y.itemSize&&x.normalized===y.normalized&&x.usage===y.usage;
 return same(a.index,b.index)&&names.length===other.length&&names.every(n=>same(a.attributes[n],b.attributes[n]));
}

export class StaticGeometryResizeGroups extends NativeAssetGroups {
 constructor(scene){super(scene);this.resizeStats={attempts:0,transferred:0,rejected:0};}
 prepare(cache,key,entries,pass,stats){
  const previous=this.resizeScope,scope={cache,key,geometry:null};this.resizeScope=scope;
  try{
   const result=super.prepare(cache,key,entries,pass,stats);
   if(scope.geometry){
    this.resizeStats.attempts++;const destination=cache.get(key).mesh.geometry,source=scope.geometry;
    if(sameLayout(source,destination)){
     destination.setIndex(source.index);source.setIndex(null);
     for(const name of Object.keys(source.attributes))if(name!=='nativeVisibility'){
      destination.setAttribute(name,source.attributes[name]);source.deleteAttribute(name);
     }
     this.resizeStats.transferred++;
    }else this.resizeStats.rejected++;
   }
   return result;
  }finally{
   // On a failed prepare the old geometry still owns all static attributes.
   // On success it owns only the old visibility buffer. Both paths dispose it.
   scope.geometry?.dispose();this.resizeScope=previous;
  }
 }
 retire(cache,key){
  const scope=this.resizeScope,g=cache.get(key);
  if(scope?.cache===cache&&scope.key===key&&g?.pass==='color'){
   scope.geometry=g.mesh.geometry;g.mesh.removeFromParent();g.mesh.dispose();cache.delete(key);
  }else super.retire(cache,key);
 }
}
