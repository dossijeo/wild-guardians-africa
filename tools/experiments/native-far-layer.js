import {FarSceneStream} from './far-scene-stream.js';
import {FarTreeTransitions} from './far-tree-transitions.js';
import {NativeFarCoverage} from './native-far-coverage.js';
import {treeAtlasAnchor} from './far-tree-sampling.js';
import {createFarImpostorPrototype} from './far-impostor-prototype.js';

// Regional billboard ownership; native geometry and atlas textures are borrowed.
// Call after native CPU packing and supply coverage with verified GPU completion.
export class NativeFarLayer {
 constructor({scene,source,texture,metadata,options={},stream=new FarSceneStream(),prepare,create=createFarImpostorPrototype,treesOnly=true,attachData=()=>{},selectTrees=trees=>trees}){
  if(typeof prepare!=='function')throw Error('Explicit GPU preparation is required');
  this.scene=scene;this.source=source;this.texture=texture;this.metadata=metadata;this.options=options;this.stream=stream;this.prepare=prepare;this.create=create;
  this.treesOnly=treesOnly;this.attachData=attachData;this.selectTrees=selectTrees;
  this.transitions=new FarTreeTransitions();this.fade=new NativeFarCoverage(metadata.localBase,options);this.current=null;this.epoch=0;this.closed=false;this.suppressed=new Set();this.revision=0;
 }
 async request(key,request){
  if(this.closed)return null;
  if(this.current?.key===key&&!this.stream.pending)return this.current;
  const epoch=++this.epoch,result=await this.stream.request(key,{...request,treesOnly:this.treesOnly});
  if(this.closed||epoch!==this.epoch||!result)return null;
  const trees=this.selectTrees(result.data.trees).map(tree=>treeAtlasAnchor(tree,this.metadata.localBase));
  const candidate=this.create(this.source,this.texture,this.metadata,trees,{...this.options,nativeModels:false});
  try{this.attachData(candidate,result.data);await this.prepare(candidate,()=>this.closed||epoch!==this.epoch);}
  catch(error){candidate.dispose({disposeTexture:false});if(this.closed||epoch!==this.epoch)return null;throw error;}
  if(this.closed||epoch!==this.epoch){candidate.dispose({disposeTexture:false});return null;}
  const previous=this.current;
  this.transitions.bind(candidate,trees);this.transitions.setSuppressions(this.suppressed);
  this.scene.add(candidate.impostors);this.current={key,prototype:candidate,trees};this.revision++;
  if(previous){this.scene.remove(previous.prototype.impostors);previous.prototype.dispose({disposeTexture:false});}
  return this.current;
 }
 update(chunks,camera,coverage,gpuReady,dt,origin={x:0,z:0},suppressed=this.suppressed){
  if(this.closed||!this.current)return;
  this.latest={chunks,camera};
  this.suppressed=suppressed;this.transitions.setSuppressions(suppressed);this.transitions.setCoverage(coverage,gpuReady);this.transitions.advance(dt);
  const p=this.current.prototype;p.update(camera,origin);
  this.fade.update(chunks,camera,id=>p.treeState(id),this.revision+':'+p.stats().readinessRevision);
 }
 dispose(chunks,camera){
  if(this.closed)return;this.closed=true;this.epoch++;this.stream.dispose();this.transitions.clear();
  chunks??=this.latest?.chunks;camera??=this.latest?.camera;
  if(chunks&&camera)this.fade.update(chunks,camera,()=>null,++this.revision+':disposed');
  if(this.current){this.scene.remove(this.current.prototype.impostors);this.current.prototype.dispose({disposeTexture:false});this.current=null;}
  this.latest=null;
 }
}
