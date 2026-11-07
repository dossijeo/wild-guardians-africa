import {pause,resume} from '../simulation/game.js';
export const TUTORIAL_ACTION_PAUSE='tutorial-action';
// Presentation owns this pause: never retain it without an actionable hand.
export function tutorialActionPauseWanted(state,{hudTarget=false,worldTarget=null,selectionOpen=false}={}){
 return state.day===1&&!state.pauses.some(reason=>reason!==TUTORIAL_ACTION_PAUSE)&&!state.result&&!state.tutorial.basicSkipped&&(['center','plant'].includes(state.tutorial.step)||['magic.growth','magic.multiply'].includes(state.tutorial.reading))&&!!(hudTarget||worldTarget||selectionOpen&&state.pauses.includes(TUTORIAL_ACTION_PAUSE));
}
export function syncTutorialActionPause(state,targets={}){
 const active=tutorialActionPauseWanted(state,targets);
 if(active)pause(state,TUTORIAL_ACTION_PAUSE);else resume(state,TUTORIAL_ACTION_PAUSE);
 return active;
}
