// QA observer only. No GL queries, resource mutations or traversal when absent.
import {Vector4} from 'three';
const observers=new WeakMap();
const rootIdentity=root=>({uuid:root?.uuid??null,name:root?.name??'',type:root?.type??null});
function emit(handle,phase,details={}){
 const entry=handle?.entry;if(!entry||entry.closed)return;
 try{entry.listener({phase,at:performance.now(),request:{...handle.request,root:{...handle.request.root}},...details});}
 catch(error){entry.errors.push(String(error));}
}
export function observeNativePreparation(renderer,listener){
 if(typeof listener!=='function')throw Error('Preparation observer must be a function');
 if(observers.has(renderer))throw Error('Preparation observer already installed');
 const entry={listener,closed:false,sequence:0,scope:null,objects:new WeakMap(),seen:new WeakMap(),errors:[]};observers.set(renderer,entry);
 return {errors:entry.errors,dispose(){if(entry.closed)return;entry.closed=true;entry.scope=null;entry.objects=new WeakMap();entry.seen=new WeakMap();entry.listener=null;observers.delete(renderer);}};
}
export function beginNativePreparationTrace(renderer,root,epoch){
 const entry=observers.get(renderer);if(!entry)return null;
 const handle={entry,root,request:{id:++entry.sequence,root:rootIdentity(root),epoch,status:'pending'}};
 emit(handle,'request');return handle;
}
export function nativePreparationTraceStage(handle,phase,details){
 if(!handle)return;
 if(phase==='ready')handle.request.status='ready';
 if(phase==='cancelled'||phase==='failed')handle.request.status=phase;
 emit(handle,phase,details);
}
export function withNativePreparationDrawTrace(handle,draw){
 if(!handle||handle.entry.closed)return draw();
 const entry=handle.entry,previous=entry.scope;entry.scope=handle;emit(handle,'draw-begin');
 try{return draw();}finally{emit(handle,'draw-end');if(!entry.closed)entry.scope=previous;}
}
export function endNativePreparationTrace(handle){if(handle)handle.root=null;}
export function nativePreparationDrawScope(renderer){
 const scope=observers.get(renderer)?.scope;
 return scope?{...scope.request,root:{...scope.request.root}}:null;
}
function attributeIdentity(attribute){return attribute?{version:attribute.version,count:attribute.count,itemSize:attribute.itemSize,bytes:attribute.array?.byteLength??null}:null;}
function geometryIdentity(geometry){return {uuid:geometry?.uuid??null,position:attributeIdentity(geometry?.attributes?.position),normal:attributeIdentity(geometry?.attributes?.normal),uv:attributeIdentity(geometry?.attributes?.uv),color:attributeIdentity(geometry?.attributes?.color),index:attributeIdentity(geometry?.index)};}
function outputIdentity(renderer){
 return {target:renderer.getRenderTarget?.()?.uuid??null,viewport:renderer.getViewport?.(new Vector4()).toArray()??null,scissor:renderer.getScissor?.(new Vector4()).toArray()??null,scissorTest:renderer.getScissorTest?.()??null,outputColorSpace:renderer.outputColorSpace??null,toneMapping:renderer.toneMapping??null,autoClear:renderer.autoClear,shadowEnabled:renderer.shadowMap?.enabled??null,shadowAutoUpdate:renderer.shadowMap?.autoUpdate??null,shadowNeedsUpdate:renderer.shadowMap?.needsUpdate??null};
}
// Call after renderBufferDirect. Material's renderer properties then already
// exist. This records only warm submissions and first subsequent ordinary
// submission of a seam per request, not a per-frame resource scan.
export function observeNativePreparationDraw(renderer,object,material,geometry,observedEpoch=null){
 const entry=observers.get(renderer);if(!entry||!object?.userData?.farGroundSeam)return;
 const scope=entry.scope;
 let owned=false;
 if(scope)for(let node=object;node;node=node.parent)if(node===scope.root){owned=true;break;}
 const previous=entry.objects.get(object),handle=scope??previous;
 if(!handle)return;
 const phase=scope?(owned?'prepared-object':'collateral-object'):'ordinary-object';
 const seen=entry.seen.get(object)??{};
 if(seen[phase]===handle.request.id)return;
 seen[phase]=handle.request.id;entry.seen.set(object,seen);
 if(scope&&owned)entry.objects.set(object,scope);
 try{
  const program=renderer.properties?.get?.(material)?.currentProgram,recipeKey=material?.customProgramCacheKey?.()??null;
  emit(handle,phase,{object:rootIdentity(object),resource:geometryIdentity(geometry),material:{uuid:material?.uuid??null,version:material?.version??null,recipeKey},program:{id:program?.id??null,cacheKey:program?.cacheKey??null},output:outputIdentity(renderer),observedEpoch,submission:'renderBufferDirect-returned; not verified primitive/pixel coverage',ownership:owned?'inside-preparation-root':scope?'outside-preparation-root':'previous-observed-owned-request',scope:'Identity/versions/submission only; not allocation, fence ownership or compilation-cost proof.'});
 }catch(error){entry.errors.push(String(error));}
}
