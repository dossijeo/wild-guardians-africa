import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {postIntroMetrics,scorePostIntro} from '../tools/evolutionary-balance/post-intro-fitness.mjs';
import {validatePilotConfig} from '../tools/evolutionary-balance/run-post-intro-pilot.mjs';

const mangroves=arm=>JSON.parse(gunzipSync(readFileSync(new URL(
 `../docs/qa/evolutionary-balance/matched-defense-14/results/${arm}-manglares-123-14.json.gz`,import.meta.url))));

test('post-intro metrics expose native crop and delivery collapse without treating reinvestment as inactivity',()=>{
 const defended=postIntroMetrics(mangroves('matched-walls-current-magic'));
 const noWalls=postIntroMetrics(mangroves('matched-no-walls-current-magic'));
 const noDefense=postIntroMetrics(mangroves('matched-no-defense-current-magic'));
 assert.deepEqual([defended.opening.delivered,defended.terminal.delivered],[341,352]);
 assert.deepEqual([noWalls.opening.delivered,noWalls.terminal.delivered],[357,203]);
 assert.deepEqual([noDefense.opening.delivered,noDefense.terminal.delivered],[359,157]);
 assert.equal(defended.terminal.operating,-142);
 assert.equal(defended.productiveAtEnd,true);
 assert.deepEqual([defended.terminal.living,noWalls.terminal.living,noDefense.terminal.living],[167,19,6]);
});

test('post-intro fitness distinguishes native defeat, technical censor and collapsed farm',()=>{
 const rows=Array.from({length:14},(_,i)=>({day:i+1,delivered:10,living:30,money:500,
  income:100,wages:40,seeds:40,repairs:0,destroyed:0}));
 const survivor={status:'completed',completedNights:14,result:null,rows,raid:[]};
 const defeated={...survivor,result:'defeat'};
 const live=scorePostIntro(survivor,14,{minimumTerminalDeliveryPerDay:5});
 assert.equal(live.valid,true);
 assert.equal(live.scoreVersion,'post-intro-v1');
 assert.equal(live.score-scorePostIntro(defeated,14,{minimumTerminalDeliveryPerDay:5}).score,500);
 assert.equal(scorePostIntro(survivor,14,{minimumTerminalDeliveryPerDay:11}).reason,'collapsed-production');
 assert.equal(scorePostIntro({...survivor,rows:rows.map(r=>({...r,delivered:r.day>11?0:r.delivered}))},14).reason,'collapsed-production');
 const defeatedInactive=scorePostIntro({...defeated,rows:rows.map(r=>({...r,delivered:r.day>11?0:r.delivered}))},14);
 assert.equal(defeatedInactive.valid,true);
 assert.equal(defeatedInactive.nativeResult,'defeat');
 assert.equal(defeatedInactive.competitiveEligible,false);
 assert.equal(scorePostIntro({...survivor,status:'error',name:'CampaignCostStop'},14).reason,'computational-cost-stop');
 assert.equal(scorePostIntro({...survivor,completedNights:7,result:null},14).reason,'truncated');
 assert.throws(()=>scorePostIntro(survivor,7),/14 nights/);
});

test('post-intro pilot requires distinct paired native scenarios and frozen legal genes',()=>{
 const scenarios=[{biome:'sabana',seed:411},{biome:'gran-rio',seed:626}];
 const config={output:'docs/qa/evolutionary-balance/post-intro-pilot-14/results',
  scenarios,genomes:{walls:{},none:{wallPolicy:'none'}}};
 const valid=validatePilotConfig(config);
 assert.equal(valid.days,14);
 assert.equal(valid.genomes.none.wallPolicy,'none');
 assert.equal(validatePilotConfig({...config,minimumTerminalDeliveryPerDay:493/6}).minimumTerminalDeliveryPerDay,493/6);
 assert.throws(()=>validatePilotConfig({...config,minimumTerminalDeliveryPerDay:-1}),/delivery floor/);
 assert.throws(()=>validatePilotConfig({...config,days:7}),/budget/);
 assert.throws(()=>validatePilotConfig({...config,scenarios:[scenarios[0],scenarios[0]]}),/distinct/);
 assert.throws(()=>validatePilotConfig({...config,genomes:{walls:{},none:{wallPolicy:'bad'}}}),/wall/);
});
