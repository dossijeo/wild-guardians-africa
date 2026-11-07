import {captureMotionPeers} from './worker-motion-peers.js';
import {captureHyenaTickSamples} from './worker-hyena-tick-samples.js';
import {captureActorTickStates} from './worker-actor-tick-states.js';
import {historicalInactiveActor} from './historical-inactive-actors.js';
import {certifyHistoricalSeparation} from './worker-historical-separation.js';
import {captureHistoricalGates} from './worker-historical-gates.js';

// Observes already-executed movement for the whole authority roster. This is
// not a reservation, a future route or a certificate for visual interpolation.
export function captureWorldMotion(game,readRevisions,readPhysicsActivity=null,{spatialNavigation=null,maxSpatialSegments=2048,includeHyenaSamples=true}={}){
 if(!game||!Number.isFinite(game.elapsed)||typeof readRevisions!=='function')throw TypeError('Invalid world motion capture');
 if(typeof includeHyenaSamples!=='boolean')throw TypeError('Invalid hyena diagnostics');
 const read=()=>{const value=readRevisions();if(!value||!['topology','chunks','terrain','payloads'].every(key=>Number.isSafeInteger(value[key])&&value[key]>=0))throw TypeError('Invalid world motion revisions');return {...value};};
 const start=game.elapsed,before=read(),gates=captureHistoricalGates(game),capture=captureMotionPeers(game,null);let visual=null;if(includeHyenaSamples)try{visual=captureHyenaTickSamples(game);}catch{visual={sample(){},invalidate(){},finish(){return {complete:false,actors:[]};}};}let actorStates;try{actorStates=captureActorTickStates(game);}catch{actorStates={sample(){},invalidate(){},finish(){return {complete:false,actors:[]};}};}let finished=false,physicsActivityObserved=false,physicsSamplesComplete=typeof readPhysicsActivity==='function';
 const samplePhysics=()=>{if(!physicsSamplesComplete)return;try{const active=readPhysicsActivity();if(typeof active!=='boolean')throw TypeError('Invalid physics activity');physicsActivityObserved||=active;}catch{physicsSamplesComplete=false;}};
 samplePhysics();
 return {sampleTick(){samplePhysics();gates.sample();try{visual?.sample();}catch{visual?.invalidate();}try{actorStates.sample();}catch{actorStates.invalidate();}},invalidateSamples(){physicsSamplesComplete=false;visual?.invalidate();actorStates.invalidate();},checkpoint(){if(finished)throw Error('World motion capture finished');gates.sample();capture.checkpoint();},finish(){if(finished)throw Error('World motion capture finished');finished=true;samplePhysics();const {peers,rosterChanged}=capture.finish(),after=read(),end=game.elapsed;if(!Number.isFinite(end)||end<start)throw Error('Invalid world motion time');
  // This evidence covers only static navigation obstacles, not actor/actor
  // separation, moving gate leaves, physics, animation or visual input.
  const tickStates=(()=>{try{return actorStates.finish();}catch{return {complete:false,actors:[]};}})();
  let spatialEvidence=null;if(spatialNavigation&&typeof spatialNavigation.segmentClear==='function'&&Number.isSafeInteger(maxSpatialSegments)&&maxSpatialSegments>0&&!rosterChanged&&Object.keys(before).every(key=>before[key]===after[key]))try{
   const workers=new Map(game.workers.map(actor=>[actor.id,actor])),animals=new Map((game.raid?.animals??[]).map(actor=>[actor.id,actor]));let checked=0,clear=true;
   for(const peer of peers){const actor=workers.get(peer.actorId)??animals.get(peer.actorId),worker=workers.has(peer.actorId);if(!actor||!peer.continuous||!peer.timed||(actor.radius??.28)!==peer.radius){clear=false;break;}if(historicalInactiveActor(peer,tickStates,start,end)){if(++checked>maxSpatialSegments){clear=false;break;}continue;}const segments=peer.segments.length?peer.segments:[{x0:peer.start.x,z0:peer.start.z,x1:peer.end.x,z1:peer.end.z}];for(const segment of segments){if(++checked>maxSpatialSegments||!spatialNavigation.segmentClear({x:segment.x0,z:segment.z0},{x:segment.x1,z:segment.z1},peer.radius,null,worker)){clear=false;break;}}if(!clear)break;}
   const current=read();if(clear&&Object.keys(before).every(key=>before[key]===current[key]))spatialEvidence={version:1,start,end,revisions:{...before},actors:peers.length,segments:checked};
  }catch{/* Unsupported profiles or absent authority fail closed. */}
  let separationEvidence=null;if(spatialEvidence&&physicsSamplesComplete&&!physicsActivityObserved&&certifyHistoricalSeparation(peers,start,end,{tickStates})){const gateProof=gates.certify(peers,tickStates,start,end);if(gateProof)separationEvidence={version:1,start,end,actors:peers.length,gates:gateProof};}
  return {start,end,actors:peers,physicsActivity:{samplesComplete:physicsSamplesComplete,observed:physicsActivityObserved},...(visual?{hyenaTickSamples:(()=>{try{return visual.finish();}catch{return {complete:false,actors:[]};}})()}:{}),actorTickStates:tickStates,rosterChanged,topologyChanged:before.topology!==after.topology,chunkChanged:before.chunks!==after.chunks,terrainChanged:before.terrain!==after.terrain||before.payloads!==after.payloads,...(spatialEvidence?{spatialEvidence}:{}),...(separationEvidence?{separationEvidence}:{})};}};
}
