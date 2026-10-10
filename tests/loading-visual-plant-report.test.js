import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
const source=readFileSync('src-tauri/smoke.js','utf8'),finish=source.slice(source.indexOf('  async function finish(error)'),source.indexOf('  async function checkVisibility(fixture)'));
test('requested plant action needs actual additional-plant pixels and cannot mask a gate failure',async()=>{
 for(const mode of ['good','missing','notcaptured','logicalchanged','gatefailure']){
  const visual={frames:[{label:'additional-plant',plants:[1,2,3,4,5]}],errors:[],plantAction:{result:{id:'loading-maize-5'},afterCount:5,logicalPlantsUnchanged:true}};
  if(mode==='missing')delete visual.plantAction;if(mode==='notcaptured')visual.frames=[];if(mode==='logicalchanged')visual.plantAction.logicalPlantsUnchanged=false;
  const context={report:{checks:{},errors:[]},finished:false,timeout:1,worldStartedAt:0,worldReadyAt:mode==='gatefailure'?null:100,performance:{now:()=>100},clearTimeout(){},document:{querySelector:()=>null,visibilityState:'visible',hasFocus:()=>true},
   window:{__desktopSmokeVisualCapture:true,__desktopSmokeVisualPlant:true,__wildGuardiansLoadingVisualQa:{report:visual},__TAURI_INTERNALS__:{invoke:async()=>{}}}};
  const report=await runInNewContext(`${finish}\n(async()=>{await finish(${mode==='gatefailure'?"Error('Original90 gate failed')":''});return report;})()`,context);
  assert.equal(report.ok,mode==='good');if(mode==='gatefailure')assert.ok(report.errors.includes('Error: Original90 gate failed'));
 }
});
