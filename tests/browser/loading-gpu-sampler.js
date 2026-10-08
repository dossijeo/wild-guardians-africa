// QA only. Timer queries measure submitted GPU work, not CPU frame delivery.
// Never synchronously wait for results, nest queries or retain an unbounded queue.
export class LoadingGpuSampler {
 constructor(gl,{every=12,maxPending=8}={}){this.gl=gl;this.ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');this.every=every;this.maxPending=maxPending;this.calls=0;this.pending=[];this.active=false;this.stopped=false;this.report={supported:!!this.ext,samples:[],disjointDropped:0,queueSkipped:0};}
 measure(kind,operation){
  if(!this.ext||this.stopped||this.active||++this.calls%this.every)return operation();
  const {gl,ext}=this;
  if(gl.isContextLost()||gl.getParameter(ext.GPU_DISJOINT_EXT))return operation();
  if(this.pending.length>=this.maxPending){this.report.queueSkipped++;return operation();}
  const query=gl.createQuery();if(!query)return operation();
  this.active=true;gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
  try{return operation();}finally{gl.endQuery(ext.TIME_ELAPSED_EXT);this.active=false;this.pending.push({query,kind});}
 }
 poll(){
  if(!this.ext||this.stopped)return;const {gl,ext}=this;
  if(gl.isContextLost()||gl.getParameter(ext.GPU_DISJOINT_EXT)){this.report.disjointDropped+=this.pending.length;for(const item of this.pending)gl.deleteQuery(item.query);this.pending.length=0;return;}
  for(let i=this.pending.length-1;i>=0;i--){const item=this.pending[i];if(!gl.getQueryParameter(item.query,gl.QUERY_RESULT_AVAILABLE))continue;this.report.samples.push({kind:item.kind,ms:gl.getQueryParameter(item.query,gl.QUERY_RESULT)/1e6});gl.deleteQuery(item.query);this.pending.splice(i,1);}
 }
 dispose(){if(this.stopped)return;this.poll();this.stopped=true;for(const item of this.pending)this.gl.deleteQuery(item.query);this.pending.length=0;}
}
