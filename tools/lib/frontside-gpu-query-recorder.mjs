// Independent elapsed-query recorder. No renderer/context creation or retry policy.
export function createGpuQueryRecorder(gl,{maxPending=32}={}) {
 const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),pending=[],samples=[];
 const stats={supported:!!ext,disjointEvents:0,discarded:0,overflowSkipped:0,foreignQuerySkipped:0,allocationFailures:0,contextLost:false};
 let active=null,closed=false,disjointPreviously=false;
 const remove=entry=>{try{gl.deleteQuery(entry.query);}finally{const i=pending.indexOf(entry);if(i>=0)pending.splice(i,1);}};
 function poll(){
  if(closed||!ext)return;
  if(gl.isContextLost()){stats.contextLost=true;for(const entry of [...pending]){stats.discarded++;remove(entry);}return;}
  const disjoint=!!gl.getParameter(ext.GPU_DISJOINT_EXT);
  if(disjoint){if(!disjointPreviously)stats.disjointEvents++;for(const entry of [...pending]){stats.discarded++;remove(entry);}}
  disjointPreviously=disjoint;
  if(disjoint)return;
  for(const entry of [...pending]){
   if(!gl.getQueryParameter(entry.query,gl.QUERY_RESULT_AVAILABLE))continue;
   const nanoseconds=gl.getQueryParameter(entry.query,gl.QUERY_RESULT);
   if(Number.isFinite(nanoseconds)&&nanoseconds>=0)samples.push({frame:entry.frame,ms:nanoseconds/1e6});else stats.discarded++;
   remove(entry);
  }
 }
 function begin(frame){
  if(closed)throw Error('GPU query recorder closed');
  if(!Number.isInteger(frame)||frame<0)throw Error('Invalid frame identifier');
  if(active)throw Error('Recorder query already active');
  if(!ext)return false;
  poll();if(stats.contextLost||disjointPreviously)return false;
  if(pending.length>=maxPending){stats.overflowSkipped++;return false;}
  if(gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY)){stats.foreignQuerySkipped++;return false;}
  const query=gl.createQuery();if(!query){stats.allocationFailures++;return false;}
  active={query,frame};
  try{gl.beginQuery(ext.TIME_ELAPSED_EXT,query);}catch(error){gl.deleteQuery(query);active=null;throw error;}
  return true;
 }
 function end(){if(!active)return;const entry=active;active=null;try{gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(entry);}catch(error){gl.deleteQuery(entry.query);stats.discarded++;throw error;}}
 function snapshot(){return{...stats,pending:pending.length+(active?1:0),samples:samples.map(s=>({...s}))};}
 function dispose(){if(closed)return snapshot();if(active)end();for(const entry of [...pending]){stats.discarded++;remove(entry);}closed=true;return snapshot();}
 return{begin,end,poll,snapshot,dispose};
}
