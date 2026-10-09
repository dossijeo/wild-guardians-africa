// QA only. EXT_disjoint_timer_query_webgl2 results are read asynchronously.
// https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/
export class GpuTimer {
  constructor(gl, capacity=16, enabled=true) {
    this.gl=gl;this.capacity=capacity;this.pending=[];this.samples=[];this.active=null;
    this.ext=enabled?gl.getExtension('EXT_disjoint_timer_query_webgl2'):null;
    this.reason=!enabled?'disabled':!this.ext?'extension-unavailable':gl.getQuery(this.ext.TIME_ELAPSED_EXT,this.ext.QUERY_COUNTER_BITS_EXT)>0?null:'counter-unavailable';
    this.stats={disjointEvents:0,discarded:0,overflowSkipped:0,foreignQuerySkipped:0,allocationFailures:0,unresolvedAtDispose:0,contextLost:false};
    this.disposed=false;
  }
  clear() {
    const queries=[...this.pending,...(this.active?[this.active]:[])];
    if(this.active&&!this.gl.isContextLost())this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    for(const {query} of queries)this.gl.deleteQuery(query);
    this.stats.discarded+=queries.length+this.samples.length;
    this.pending=[];this.active=null;this.samples=[];
  }
  poll() {
    if(this.disposed||this.reason)return false;
    if(this.gl.isContextLost()){this.stats.contextLost=true;this.clear();this.reason='context-lost';return false;}
    if(this.gl.getParameter(this.ext.GPU_DISJOINT_EXT)){this.stats.disjointEvents++;this.clear();return false;}
    this.pending=this.pending.filter(entry=>{
      if(!this.gl.getQueryParameter(entry.query,this.gl.QUERY_RESULT_AVAILABLE))return true;
      const ns=this.gl.getQueryParameter(entry.query,this.gl.QUERY_RESULT);
      if(Number.isFinite(ns)&&ns>=0)this.samples.push({frame:entry.frame,ms:ns/1e6});
      else this.stats.discarded++;
      this.gl.deleteQuery(entry.query);return false;
    });return true;
  }
  begin(frame) {
    if(!this.poll()||this.active)return false;
    if(this.pending.length>=this.capacity){this.stats.overflowSkipped++;return false;}
    if(this.gl.getQuery(this.ext.TIME_ELAPSED_EXT,this.gl.CURRENT_QUERY)){this.stats.foreignQuerySkipped++;return false;}
    const query=this.gl.createQuery();if(!query){this.stats.allocationFailures++;return false;}
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT,query);this.active={query,frame};return true;
  }
  end() {
    if(!this.active)return;
    if(this.gl.isContextLost()){this.poll();return;}
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);this.pending.push(this.active);this.active=null;
  }
  report() {
    return {supported:this.reason==='disabled'?null:!this.reason,reason:this.reason,...this.stats,pending:this.pending.length,samples:this.samples.map(s=>({...s}))};
  }
  dispose() {
    if(this.disposed)return;
    this.stats.unresolvedAtDispose=this.pending.length+(this.active?1:0);
    if(this.active&&!this.gl.isContextLost())this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    for(const {query} of [...this.pending,...(this.active?[this.active]:[])])this.gl.deleteQuery(query);
    this.pending=[];this.active=null;this.disposed=true;
  }
}
