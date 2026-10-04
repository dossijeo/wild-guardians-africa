import {pause,resume} from '../simulation/game.js';
export const TUTORIAL_ACTION_PAUSE='tutorial-action';
// Presentation owns this pause: never retain it without an actionable hand.
export function syncTutorialActionPause(state,{hudTarget=false,worldTarget=null,selectionOpen=false}={}){
 const active=state.day===1&&!state.pauses.some(reason=>reason!==TUTORIAL_ACTION_PAUSE)&&!state.result&&!state.tutorial.basicSkipped&&['center','plant'].includes(state.tutorial.step)&&!!(hudTarget||worldTarget||selectionOpen&&state.pauses.includes(TUTORIAL_ACTION_PAUSE));
 if(active)pause(state,TUTORIAL_ACTION_PAUSE);else resume(state,TUTORIAL_ACTION_PAUSE);
 return active;
}
