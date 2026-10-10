import {frozenSource} from './frozen-loading-source.js';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync,spawnSync} from 'node:child_process';import {runInNewContext} from 'node:vm';
import {applyLoadingCropPairOverlap} from '../src/app/loading-crop-pair-option.js';import {normalizePairWiring} from './world-crop-pair-wiring-normalize.js';
test('only strict opt-in mutates the selected owner; absent/false/string leave defaults untouched',()=>{
 for(const value of [undefined,false,'true',1]){const owner={};applyLoadingCropPairOverlap(owner,{__desktopSmokeCropPairOverlap:value});assert.deepEqual(owner,{});}
 const owner={},other={};applyLoadingCropPairOverlap(owner,{__desktopSmokeCropPairOverlap:true});assert.deepEqual(owner,{loadingCropPairOverlap:true});assert.deepEqual(other,{});
});
test('wiring outside exact hunks matches reviewed71d4; native guards and unchanged deadlines',()=>{
 for(const file of ['src/app/main.js','src-tauri/src/main.rs','src-tauri/smoke.js','.github/workflows/windows.yml'])assert.equal(normalizePairWiring(file,readFileSync(file,'utf8')),frozenSource('71d4db4e',file).replaceAll('\r\n','\n'),file);
 const rust=readFileSync('src-tauri/src/main.rs','utf8');assert.match(rust,/--smoke-report[\s\S]*webview.label\(\) == "main"[\s\S]*--smoke-crop-pair-overlap[\s\S]*__desktopSmokeCropPairOverlap = true/);
 const app=readFileSync('src/app/main.js','utf8');assert.match(app,/owner=new WorldScene\(canvas,onPick\);applyLoadingCropPairOverlap\(owner\)/);assert.equal((app.match(/applyLoadingCropPairOverlap\(owner\)/g)||[]).length,1);
});
test('real PowerShell argv keeps absent/false paths exact and selections independent',{skip:process.platform!=='win32'?'Windows PowerShell execution evidence only; portable source/guard tests remain active':false},()=>{
 const workflow=readFileSync('.github/workflows/windows.yml','utf8'),start=workflow.indexOf("          $smokeArguments = @('--smoke-report', $report)"),end=workflow.indexOf('          $process = Start-Process',start),block=workflow.slice(start,end);
 for(const [trace,pair] of [['',''],['false','false'],['true','false'],['false','true'],['true','true']]){const code="$report='qa-report.json';\n"+block.replaceAll('${{ github.event.inputs.loading_trace }}',trace).replaceAll('${{ github.event.inputs.crop_pair_overlap }}',pair)+'ConvertTo-Json -Compress -InputObject @($smokeArguments)';const run=spawnSync('powershell',['-NoProfile','-Command',code],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.deepEqual(JSON.parse(run.stdout.trim()),['--smoke-report','qa-report.json',...(trace==='true'?['--smoke-loading-trace']:[]),...(pair==='true'?['--smoke-crop-pair-overlap']:[])]);}
});
test('finish reports selection on failure without changing ok or interpreting it as readiness',async()=>{
 const source=readFileSync('src-tauri/smoke.js','utf8'),finish=source.slice(source.indexOf('  async function finish(error)'),source.indexOf('  async function listFixtureForSmoke('));
 for(const selected of [true,false]){const context={report:{checks:{},errors:[]},finished:false,timeout:1,worldStartedAt:0,worldReadyAt:null,performance:{now:()=>90000},clearTimeout(){},document:{querySelector:()=>null,visibilityState:'visible',hasFocus:()=>true},window:{__desktopSmokeCropPairOverlap:selected,__TAURI_INTERNALS__:{invoke:async()=>{}}}};const report=await runInNewContext(`${finish}\n(async()=>{await finish(Error('original readiness failure'));return report;})()`,context);assert.equal(report.ok,false);assert.equal(report.checks.loadingRecipe.cropPairOverlap,selected);assert.ok(report.errors.some(error=>error.includes('original readiness failure')));}
});
