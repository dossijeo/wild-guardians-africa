import {LoadingVisualQa} from './loading-visual-qa.js';
import {createLoadingVisualPlantQa} from './loading-visual-plant-qa.js';
// Smoke-only connection to the existing draw. Export data, never an action API.
export function installLoadingVisualQa(world,diorama,{scope=globalThis,create=options=>new LoadingVisualQa(options)}={}){
 let enabled=false;try{enabled=scope.__desktopSmokeVisualCapture===true;}catch{return null;}
 if(!enabled||world.disposed||world.loading.signal.aborted||diorama.onAfterDraw)return null;
 let natural65=false;try{natural65=scope.__desktopSmokeVisualPlant===true&&scope.__desktopSmokeVisualPlantProgress65===true;}catch{}
 let collector;try{collector=create({enabled:true,...(natural65?{catchupProgress:.65}:{})});}catch{return null;}let closed=false,plant=null;
 const close=({cancelled=false}={})=>{if(closed)return collector.report;closed=true;world.loading.signal.removeEventListener('abort',abort);if(diorama.onAfterDraw===draw)diorama.onAfterDraw=null;if(diorama.visualQa===owner)diorama.visualQa=null;try{plant?.close({cancelled});return collector.close({cancelled});}catch(error){collector.report.errors.push({label:'close',message:String(error)});return collector.report;}finally{plant=null;world=null;diorama=null;}};
 const abort=()=>close({cancelled:true});
 const draw=(actual,progress)=>{if(closed||world.disposed||world.loading.signal.aborted)return;if(diorama.onAfterDraw!==draw||diorama.visualQa!==owner){close({cancelled:true});return;}if(actual!==diorama)return;try{collector.afterDraw(actual,progress);plant?.afterDraw(actual,progress);}catch(error){collector.report.errors.push({label:'observer',message:String(error)});close({cancelled:true});}};
 const owner={close};
 try{Object.defineProperty(scope,'__wildGuardiansLoadingVisualQa',{value:Object.freeze({report:collector.report}),writable:false,configurable:true});}catch{try{collector.close({cancelled:true});}catch{}return null;}
 try{if(scope.__desktopSmokeVisualPlant===true)plant=createLoadingVisualPlantQa(diorama,collector.report,{enabled:true,startProgress:natural65 ? .65 : 0});}catch(error){collector.report.errors.push({label:'plant-guard',message:String(error)});}
 diorama.onAfterDraw=draw;diorama.visualQa=owner;world.loading.signal.addEventListener('abort',abort,{once:true});return owner;
}
