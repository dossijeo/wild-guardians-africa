// QA only: disjoint-safe, non-overlapping GPU queries around native render calls.
// Split automatic shadow rendering out of each renderer.render rather than
// nesting elapsed queries, which WebGL forbids. No shader/visibility changes.
import {GpuTimer} from './gpu-timer.js';
export class RenderPassTimer {
 constructor(world,timer=new GpuTimer(world.renderer.getContext(),128)){
  this.world=world;this.timer=timer;this.frame=null;this.rows=[];this.stack=[];this.active=null;
  const owner=this,renderer=world.renderer,map=renderer.shadowMap;
  this.originalRender=renderer.render;this.originalShadow=map.render;
  this.render=function(scene,...args){
   if(owner.frame===null)return owner.originalRender.call(this,scene,...args);
   owner.end();const context={pass:owner.pass(scene)};owner.stack.push(context);owner.begin(context.pass,'prepare');
   try{return owner.originalRender.call(this,scene,...args);}
   finally{owner.end();owner.stack.pop();const parent=owner.stack.at(-1);if(parent)owner.begin(parent.pass,'resume');}
  };
  this.shadow=function(...args){
   const context=owner.stack.at(-1);if(!context)return owner.originalShadow.apply(this,args);
   owner.end();owner.begin(context.pass,'shadow');
   try{return owner.originalShadow.apply(this,args);}
   finally{owner.end();owner.begin(context.pass,'draw');}
  };
  renderer.render=this.render;map.render=this.shadow;
 }
 pass(scene){
  const w=this.world,target=w.renderer.getRenderTarget();
  if(target===w.destructionPass.smokeDepth)return 'world-depth';
  if(target===w.destructionPass.target)return 'building-mask';
  if(scene===w.sky.scene)return 'sky';
  if(scene===w.destructionPass.smokeScene)return 'building-smoke';
  return target===null?'screen':'other-target';
 }
 begin(pass,segment){
  const info=this.world.renderer.info.render;
  const row={id:this.rows.length,frame:this.frame,pass,segment,calls:info.calls,triangles:info.triangles};
  row.timed=this.timer.begin(row.id);this.active=row;
 }
 end(){
  if(!this.active)return;
  const row=this.active;this.active=null;
  if(row.timed)this.timer.end();
  const info=this.world.renderer.info.render;row.calls=info.calls-row.calls;row.triangles=info.triangles-row.triangles;this.rows.push(row);
 }
 start(frame){if(this.stack.length||this.frame!==null)throw Error('Pass timing already active');this.frame=frame;}
 stop(){this.end();this.frame=null;}
 poll(){return this.timer.poll();}
 report(){
  const gpu=this.timer.report(),byId=new Map(gpu.samples.map(s=>[s.frame,s.ms]));
  return {gpu,rows:this.rows.map(row=>({...row,gpuMs:byId.get(row.id)??null}))};
 }
 dispose(){
  this.stop();const r=this.world.renderer;
  if(r.render===this.render)r.render=this.originalRender;
  if(r.shadowMap.render===this.shadow)r.shadowMap.render=this.originalShadow;
  this.timer.dispose();
 }
}
