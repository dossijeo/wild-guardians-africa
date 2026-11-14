import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the production handler with a real asynchronous command result;
// the presentation and save services are deliberately controllable doubles.
async function fixture(result){
 const source=await readFile(new URL('../src/app/main.js',import.meta.url),'utf8');
 const start=source.indexOf('function buildWallStroke(points)'),end=source.indexOf('\nfunction toolPanel(',start);
 assert.ok(start>=0&&end>start);
 const calls=[],state={},tool={kind:'wall',material:'wood'},client={beginProvisionalStructure:()=>true,confirmProvisionalStructure:(...args)=>calls.push(['confirm',...args]),rejectProvisionalStructure:id=>calls.push(['reject',id])};
 const owner={workerGpuOnly:true,workerRuntime:{submit:async()=>result},webGpuWorld:{client},confirmedHud:{wallCapacity:{wood:5}},structureInputFeedback:{remove:id=>calls.push(['remove',id])},provisionalWalls:{remove(){}},clearWallPreview(){},syncResidentProps(){},workerSave:async()=>{throw Error('save unavailable');}};
 const context={world:owner,state,tool,confirmedUiState:()=>({pauses:[]}),commandId:()=> 'command',ensureWorkerSave(){},workerPresentationGround:()=>0,Game:{wallCapacity:()=>5},uiAudio:{error(){}},RESERVE_MESSAGE:'reserve',toolSession:{used(){}},performance,updateUI(){}};
 vm.runInNewContext(source.slice(start,end)+'\nglobalThis.invoke=buildWallStroke;',context);
 const points=[[1,2],[2,3]];points.structureFeedback={bind:()=>true,cancel(){}};
 return {calls,invoke:()=>context.invoke(points)};
}

test('a save failure does not reject an already confirmed wall',async()=>{
 const f=await fixture({value:true,events:[{type:'WallChainBuilt',commandId:'command',targetId:'wall'}]});
 await assert.rejects(f.invoke(),/save unavailable/);
 assert.deepEqual(f.calls,[['confirm','command','wall']]);
});

test('a rejected wall command removes the provisional presentation',async()=>{
 const f=await fixture({rejection:'blocked'});
 await assert.rejects(f.invoke(),/blocked/);
 assert.deepEqual(f.calls,[['remove','command'],['reject','command']]);
});

test('a save failure does not reject an already confirmed crop',async()=>{
 const source=await readFile(new URL('../src/app/main.js',import.meta.url),'utf8');
 const start=source.indexOf('function onPick('),end=source.indexOf('\nfunction hideHudPanel(',start);
 assert.ok(start>=0&&end>start);
 const calls=[],state={},tool={kind:'plant',species:'mijo'},client={beginProvisionalCrop:()=>true,confirmProvisionalCrop:(...args)=>calls.push(['confirm',...args]),rejectProvisionalCrop:id=>calls.push(['reject',id])};
 const owner={workerGpuOnly:true,workerRuntime:{submit:async()=>({value:true,events:[{type:'CropPlaced',commandId:'command',targetId:'crop'}]})},webGpuWorld:{client},provisionalCrops:{confirm(){},reject:id=>calls.push(['local-reject',id])},structureInputFeedback:{remove:id=>calls.push(['remove',id])},syncResidentProps(){},workerSave:async()=>{throw Error('save unavailable');}};
 let pending;const context={world:owner,state,tool,screen:'game',nav:{},safe:fn=>{pending=fn();},confirmedUiState:()=>({pauses:[],plants:[],structures:[],day:1,time:0}),guidedPlacementKind:()=>null,ensureWorkerSave(){},commandId:()=> 'command',confirmedCropId:()=> 'crop',uiAudio:{guidedPlacement(){}},toolSession:{used(){}},performance,updateUI(){}};
 vm.runInNewContext(source.slice(start,end).replaceAll('import.meta.env.DEV','false')+'\nglobalThis.invoke=onPick;',context);
 context.invoke({entityId:null,point:{x:1,y:0,z:2}});
 await assert.rejects(pending,/save unavailable/);
 assert.deepEqual(calls,[['confirm','command','crop']]);
});
