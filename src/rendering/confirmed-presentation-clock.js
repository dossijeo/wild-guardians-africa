import {floorFloat32} from './float32-time.js';
import {uniform} from 'three/tsl';

// One presentation-time source for GPU consumers. It can advance only to a
// state already committed by the presentation stream: it is not a predictor.
export function createConfirmedPresentationClock(initialElapsed){
 if(!Number.isFinite(initialElapsed)||!Number.isFinite(Math.fround(initialElapsed))||initialElapsed<0)throw TypeError('Invalid confirmed presentation time');
 const node=uniform(initialElapsed),motionNode=uniform(0),epoch=initialElapsed;let elapsed=initialElapsed,closed=false;
 return {node,motionNode,get epoch(){return epoch;},get elapsed(){return elapsed;},commit(next){if(closed||!Number.isFinite(next)||!Number.isFinite(Math.fround(next))||next<elapsed)throw TypeError('Invalid confirmed presentation time');elapsed=next;node.value=next;motionNode.value=floorFloat32(next-epoch);},dispose(){closed=true;}};
}
