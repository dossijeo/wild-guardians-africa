import {workerTutorialGuideKey,tutorialGuideCropHeightsCurrent} from '../app/worker-tutorial-guide-key.js';

// Transitional authority-side invalidation: while a guide is subscribed,
// compare exactly its existing discrete dependencies at publication time.
// Height inputs are only the crops the planner actually sampled. The full key
// never crosses the worker boundary. This is deliberately not presented as an
// event-driven implementation: removing the scan requires native revisions
// covering every dependency in workerTutorialGuideKey.
export function createTutorialGuideRevision(){
 let version=0,subscription=null,key=null,heightInputs=[],heightsValid=true;
 function next(){if(version>=Number.MAX_SAFE_INTEGER)throw Error('Tutorial guide revision exhausted');return ++version;}
 return {
  subscribe(state,{toolKind=null,toolSpell=null}={}){
   if(toolKind!==null&&typeof toolKind!=='string'||toolSpell!==null&&typeof toolSpell!=='string')throw TypeError('Invalid tutorial guide subscription');
   subscription={toolKind,toolSpell};key=workerTutorialGuideKey(state,subscription);heightInputs=[];heightsValid=true;return next();
  },
  bindHeights(state,inputs){
   if(!subscription||!Array.isArray(inputs)||inputs.some(x=>!x||typeof x.id!=='string'||typeof x.species!=='string'||!Number.isFinite(x.growth)))throw TypeError('Invalid tutorial guide height dependencies');
   heightInputs=inputs.map(({id,species,growth})=>({id,species,growth}));heightsValid=tutorialGuideCropHeightsCurrent(state,heightInputs);if(!heightsValid)next();return version;
  },
  publication(state){
   if(!subscription)return null;
   const current=workerTutorialGuideKey(state,subscription),valid=tutorialGuideCropHeightsCurrent(state,heightInputs),changed=current!==key||heightsValid&&!valid;
   key=current;heightsValid=valid;if(changed)next();return version;
  },
  clear(){subscription=null;key=null;heightInputs=[];heightsValid=true;},
  status(){return {active:!!subscription,version,heightsValid,trackedHeights:heightInputs.length};}
 };
}
