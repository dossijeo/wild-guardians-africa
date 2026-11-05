import {captureMotionPeers} from './worker-motion-peers.js';
import {captureHyenaTickSamples} from './worker-hyena-tick-samples.js';

// Observes already-executed movement for the whole authority roster. This is
// not a reservation, a future route or a certificate for visual interpolation.
export function captureWorldMotion(game,readRevisions){
 if(!game||!Number.isFinite(game.elapsed)||typeof readRevisions!=='function')throw TypeError('Invalid world motion capture');
 const read=()=>{const value=readRevisions();if(!value||!['topology','chunks','terrain','payloads'].every(key=>Number.isSafeInteger(value[key])&&value[key]>=0))throw TypeError('Invalid world motion revisions');return {...value};};
 const start=game.elapsed,before=read(),capture=captureMotionPeers(game,null);let visual;try{visual=captureHyenaTickSamples(game);}catch{visual={sample(){},invalidate(){},finish(){return {complete:false,actors:[]};}};}let finished=false;
 return {sampleTick(){visual.sample();},invalidateSamples(){visual.invalidate();},checkpoint(){if(finished)throw Error('World motion capture finished');capture.checkpoint();},finish(){if(finished)throw Error('World motion capture finished');finished=true;const {peers,rosterChanged}=capture.finish(),after=read(),end=game.elapsed;if(!Number.isFinite(end)||end<start)throw Error('Invalid world motion time');return {start,end,actors:peers,hyenaTickSamples:(()=>{try{return visual.finish();}catch{return {complete:false,actors:[]};}})(),rosterChanged,topologyChanged:before.topology!==after.topology,chunkChanged:before.chunks!==after.chunks,terrainChanged:before.terrain!==after.terrain||before.payloads!==after.payloads};}};
}
