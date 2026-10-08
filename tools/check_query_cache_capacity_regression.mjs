// Run capacity regressions against a frozen reconstruction of the previous
// two cache policies. Expected failures prove that the tests detect overflow.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const sourceUrl=new URL('../src/world/navigation.js',import.meta.url),source=readFileSync(sourceUrl,'utf8');
const needles=['if(this.walkCache.size>=50000)evictOldest(this.walkCache)','if(this.segmentCache.size>=100000)evictOldest(this.segmentCache)'];
for(const needle of needles)assert.equal(source.split(needle).length,2);
const previous=source.replace(needles[0],'if(this.walkCache.size>50000)this.walkCache.clear()')
 .replace(needles[1],'if(this.segmentCache.size>=100000)this.segmentCache.clear()')
 .replace(/from '([^']+)'/g,(match,specifier)=>specifier.startsWith('.')?`from '${new URL(specifier,sourceUrl).href}'`:match);
const dir=resolve('.cache/query-cache-capacity-regression');mkdirSync(dir,{recursive:true});
const modulePath=resolve(dir,'previous-navigation.mjs');writeFileSync(modulePath,previous);
const testSource=readFileSync(new URL('../tests/navigation-query-capacity.test.js',import.meta.url),'utf8');
const importLine="import {createOpeningWorld} from '../tools/check_opening.mjs';";
assert.equal(testSource.split(importLine).length,2);
const oldTests=testSource.replace(importLine,`import {createOpeningWorld as openingWorld} from '${new URL('./check_opening.mjs',import.meta.url).href}';
import {Navigation as Previous} from '${pathToFileURL(modulePath).href}';
function createOpeningWorld(...args){
 const world=openingWorld(...args),nav=new Previous(world.s.seed,world.s.biome,world.nav.profile);
 nav.setState(world.s);return {...world,nav};
}`);
const testPath=resolve(dir,'previous-policy.test.mjs');writeFileSync(testPath,oldTests);
const result=spawnSync(process.execPath,['--test',testPath],{encoding:'utf8',maxBuffer:1024*1024});
assert.equal(result.error,undefined);writeFileSync(resolve(dir,'tests.txt'),result.stdout+result.stderr);
assert.equal(result.status,1,'Previous policies must fail the capacity regressions');
assert.match(result.stdout,/# tests 3\b/);assert.match(result.stdout,/# pass 1\b/);assert.match(result.stdout,/# fail 2\b/);
assert.match(result.stdout,/not ok 1 - native walk queries survive capacity pressure/);
assert.match(result.stdout,/not ok 2 - native segment cache stays bounded/);
assert.match(result.stdout,/ok 3 - fractional walk queries remain uncached/);
const sha=data=>createHash('sha256').update(data).digest('hex');
const report={scope:'Expected negative test run; only walk/segment capacity policies reconstructed. Native worlds use current unchanged helpers.',expectedExitCode:1,actualExitCode:result.status,tests:3,expectedFailures:2,unchangedFractionalPass:1,sourceHashes:{navigation:sha(source),previousModule:sha(previous),productionTests:sha(testSource),generatedTests:sha(oldTests),tap:sha(result.stdout+result.stderr)}};
writeFileSync(resolve(dir,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
