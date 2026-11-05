import {captureMotionPeers} from './worker-motion-peers.js';
import {captureHyenaTickSamples} from './worker-hyena-tick-samples.js';
import {captureActorTickStates} from './worker-actor-tick-states.js';

// Observes already-executed movement for the whole authority roster. This is
// not a reservation, a future route or a certificate for visual interpolation.
export function captureWorldMotion(game,readRevisions,readPhysicsActivity=null){
 if(!game||!Number.isFinite(game.elapsed)||typeof readRevisions!=='function')throw TypeError('Invalid world motion capture');
 const read=()=>{const value=readRevisions();if(!value||!['topology','chunks','terrain','payloads'].every(key=>Number.isSafeInteger(value[key])&&value[key]>=0))throw TypeError('Invalid world motion revisions');return {...value};};
 const start=game.elapsed,before=read(),capture=captureMotionPeers(game,null);let visual;try{visual=captureHyenaTickSamples(game);}catch{visual={sample(){},invalidate(){},finish(){return {complete:false,actors:[]};}};}let actorStates;try{actorStates=captureActorTickStates(game);}catch{actorStates={sample(){},invalidate(){},finish(){return {complete:false,actors:[]};}};}let finished=false,physicsActivityObserved=false,physicsSamplesComplete=typeof readPhysicsActivity==='function';
 const samplePhysics=()=>{if(!physicsSamplesComplete)return;try{const active=readPhysicsActivity();if(typeof active!=='boolean')throw TypeError('Invalid physics activity');physicsActivityObserved||=active;}catch{physicsSamplesComplete=false;}};
 samplePhysics();
 return {sampleTick(){samplePhysics();try{visual.sample();}catch{visual.invalidate();}try{actorStates.sample();}catch{actorStates.invalidate();}},invalidateSamples(){physicsSamplesComplete=false;visual.invalidate();actorStates.invalidate();},checkpoint(){if(finished)throw Error('World motion capture finished');capture.checkpoint();},finish(){if(finished)throw Error('World motion capture finished');finished=true;samplePhysics();const {peers,rosterChanged}=capture.finish(),after=read(),end=game.elapsed;if(!Number.isFinite(end)||end<start)throw Error('Invalid world motion time');return {start,end,actors:peers,physicsActivity:{samplesComplete:physicsSamplesComplete,observed:physicsActivityObserved},hyenaTickSamples:(()=>{try{return visual.finish();}catch{return {complete:false,actors:[]};}})(),actorTickStates:(()=>{try{return actorStates.finish();}catch{return {complete:false,actors:[]};}})(),rosterChanged,topologyChanged:before.topology!==after.topology,chunkChanged:before.chunks!==after.chunks,terrainChanged:before.terrain!==after.terrain||before.payloads!==after.payloads};}};
}
