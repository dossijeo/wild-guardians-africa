import {savedNativeIdleApproach} from './native-idle-approach-restoration.js';
import {nativeIdleStrollRestorationGraphicsFixture} from './native-idle-stroll-restoration-graphics.js';

// Actual23 ->22 save, new authority/request22 and the original authored actor.
// GPU renderer, resource admission and submitted pick clocks are test doubles.
export function nativeIdleApproachRestorationGraphicsFixture({profile='youngMale',position='inside',...options}={}){
 return nativeIdleStrollRestorationGraphicsFixture({saved:savedNativeIdleApproach({profile,position}),profile,clips:['Walk_Skip','Run','Idle','Alert'],alert:true,...options});
}
