const validPoint=p=>p&&[p.at,p.x,p.z].every(Number.isFinite);
function validTrace(t){
 if(!t||typeof t.actorId!=='string'||!t.actorId||!validPoint(t.start)||!validPoint(t.end)||t.end.at<t.start.at||typeof t.continuous!=='boolean'||typeof t.timed!=='boolean'||!Array.isArray(t.segments))return false;
 let last=t.start.at,x=t.start.x,z=t.start.z;for(const s of t.segments){if(!s||![s.at,s.x0,s.z0,s.x1,s.z1].every(Number.isFinite)||s.at<t.start.at-1e-8||s.at>t.end.at+1e-8||t.continuous&&(s.x0!==x||s.z0!==z))return false;x=s.x1;z=s.z1;if(t.timed){if(!Number.isFinite(s.t0)||!Number.isFinite(s.t1)||s.t0<last-1e-8||s.t1<s.t0||s.t1>s.at+1e-8||s.t1>t.end.at+1e-8)return false;last=s.t1;}}return !t.continuous||x===t.end.x&&z===t.end.z;
}
// Shared by both presentation receivers. Validation runs against the decoded
// authoritative snapshot before mutating any displayed state.
export function validateConfirmedMotion(message,snapshot,lastElapsed){
 const actors=new Map((snapshot.raid?.animals??[]).map(a=>[a.id,a])),find=id=>actors.get(id)??snapshot.workers.find(w=>w.id===id),trace=message.motionTrace;
 if(trace!==undefined){const actor=find(trace?.actorId);if(!validTrace(trace)||trace.start.at<lastElapsed-1e-8||trace.end.at!==snapshot.elapsed||trace.continuous&&(!actor||trace.end.x!==actor.x||trace.end.z!==actor.z))throw TypeError('Invalid observed path motion');
  if(trace.peers!==undefined){if(!Array.isArray(trace.peers)||typeof trace.rosterChanged!=='boolean')throw TypeError('Invalid observed peer motion');const seen=new Set([trace.actorId]);for(const peer of trace.peers){const body=find(peer?.actorId);if(!validTrace(peer)||seen.has(peer.actorId)||peer.start.at!==trace.start.at||peer.end.at!==trace.end.at||!Number.isFinite(peer.radius)||peer.radius<=0||typeof peer.startStatus!=='string'||typeof peer.endStatus!=='string'||peer.continuous&&(!body||peer.end.x!==body.x||peer.end.z!==body.z))throw TypeError('Invalid observed peer motion');seen.add(peer.actorId);}}
 }
 const worldTrace=message.worldMotionTrace;
 if(worldTrace!==undefined){
  if(trace!==undefined||!worldTrace||!Number.isFinite(worldTrace.start)||worldTrace.start!==lastElapsed||worldTrace.end!==snapshot.elapsed||message.elapsed!==snapshot.elapsed||worldTrace.end<worldTrace.start||!Array.isArray(worldTrace.actors)||!['rosterChanged','topologyChanged','chunkChanged','terrainChanged'].every(key=>typeof worldTrace[key]==='boolean')||message.terrainChanged===true&&!worldTrace.terrainChanged)throw TypeError('Invalid observed world motion');
  const seen=new Set();for(const actor of worldTrace.actors){const body=find(actor?.actorId);if(!validTrace(actor)||seen.has(actor.actorId)||actor.start.at!==worldTrace.start||actor.end.at!==worldTrace.end||!Number.isFinite(actor.radius)||actor.radius<=0||typeof actor.startStatus!=='string'||typeof actor.endStatus!=='string'||actor.continuous&&(!body||actor.end.x!==body.x||actor.end.z!==body.z||actor.endStatus!==body.status))throw TypeError('Invalid observed world actor motion');seen.add(actor.actorId);}
  if(!worldTrace.rosterChanged){const roster=[...(snapshot.raid?.animals??[]),...snapshot.workers];if(roster.length!==seen.size||roster.some(actor=>!seen.has(actor.id)))throw TypeError('Incomplete observed world motion');}
 }
 const invalidation=message.motionInvalidation;if(invalidation!==undefined&&(!invalidation||typeof invalidation.actorId!=='string'||!invalidation.actorId||!validPoint(invalidation)||invalidation.at<0||!Number.isFinite(message.elapsed)||invalidation.at>message.elapsed||message.elapsed!==snapshot.elapsed||typeof invalidation.reason!=='string'||!invalidation.reason||trace&&(invalidation.actorId!==trace.actorId||invalidation.at<trace.start.at||invalidation.at>trace.end.at)))throw TypeError('Invalid path motion invalidation');
 return {trace,invalidation,worldTrace};
}
