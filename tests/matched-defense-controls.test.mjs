import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_GENES} from '../tools/evolutionary-balance/policy-genes.mjs';
import {MATCHED_DEFENSE_CONTROLS,matchedDefenseControl} from '../tools/evolutionary-balance/matched-defense-controls.mjs';
import {simulateNativeCampaign} from '../tools/native-campaign-runner.mjs';
import {validateMatchedConfig} from '../tools/evolutionary-balance/run-matched-defense.mjs';

test('matched diagnostic validates bounded runtime and a frozen wall-capable genome',()=>{
 assert.equal(validateMatchedConfig({days:14,seed:123}).maxDayGameTickMs,60000);
 assert.throws(()=>validateMatchedConfig({days:14,seed:123,genes:{...DEFAULT_GENES,wallPolicy:'none'}}));
 assert.throws(()=>validateMatchedConfig({days:14,seed:123,maxDayGameTickMs:0}));
});

test('matched arms share frozen agriculture and differ only in walls and Shield',()=>{
 assert.deepEqual(Object.keys(MATCHED_DEFENSE_CONTROLS),[
  'matched-walls-current-magic','matched-no-walls-current-magic',
  'matched-no-defense-current-magic']);
 assert.deepEqual(Object.values(MATCHED_DEFENSE_CONTROLS),[
  {buildRepairWalls:true,useShield:true},
  {buildRepairWalls:false,useShield:true},
  {buildRepairWalls:false,useShield:false}]);
 for(const name of Object.keys(MATCHED_DEFENSE_CONTROLS))
  assert.equal(matchedDefenseControl(name,DEFAULT_GENES),MATCHED_DEFENSE_CONTROLS[name]);
 assert.equal(matchedDefenseControl('good-current-magic',null),null);
 assert.throws(()=>matchedDefenseControl('matched-no-walls-current-magic',null),/frozen/);
});

test('short native paired smoke charges walls only in wall arm and casts no Shield in no-defense arm',
 {timeout:60000},async()=>{
  const driver=()=>({async advancePresentation(){},async waitForEntry(){},report(){return{};},async dispose(){}});
  const results=[];
  for(const [name,control] of Object.entries(MATCHED_DEFENSE_CONTROLS)){
   const result=await simulateNativeCampaign({days:2,biome:'sabana',seed:712,
    evolutionaryGenes:DEFAULT_GENES,currentMagicRules:true,nativeEvidence:false,
    reloadRaids:false,cameraEntry:false,entryDriverFactory:driver,...control});
   results.push({name,result});
   assert.deepEqual(result.policy.evolutionaryGenes,DEFAULT_GENES);
   assert.equal(result.policy.currentMagicRules,true);
   assert.equal(result.policy.buildRepairWalls,control.buildRepairWalls);
   assert.equal(result.policy.useShield,control.useShield);
  }
  const [walls,noWalls,noDefense]=results.map(x=>x.result);
  const wallCost=result=>result.daily.reduce((n,row)=>n+row.finance.walls,0);
  const shieldCommands=result=>result.state.commandIds.filter(id=>id.includes('-shield-')).length;
  const agriculturalCommands=result=>result.state.commandIds.filter(id=>
   id.includes('-growth-')||id.includes('-multiply-')).length;
  assert(wallCost(walls)>0);
  assert.equal(wallCost(noWalls),0);assert.equal(wallCost(noDefense),0);
  assert.equal(noWalls.state.structures.filter(c=>c.kind==='wall').length,0);
  assert.equal(noDefense.state.structures.filter(c=>c.kind==='wall').length,0);
  assert(shieldCommands(walls)>0);assert(shieldCommands(noWalls)>0);
  assert.equal(shieldCommands(noDefense),0);
  assert.equal(agriculturalCommands(walls),agriculturalCommands(noWalls));
  assert.equal(agriculturalCommands(noWalls),agriculturalCommands(noDefense));
  assert.deepEqual(results.map(({result})=>result.daily[0].magic),
   Array(3).fill(walls.daily[0].magic));
  assert.deepEqual(results.map(({result})=>({planted:result.daily[0].planted,
   seeds:result.daily[0].finance.seeds,wages:result.daily[0].finance.wages})),
   Array(3).fill({planted:walls.daily[0].planted,seeds:walls.daily[0].finance.seeds,
    wages:walls.daily[0].finance.wages}));
 });
