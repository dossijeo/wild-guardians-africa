import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

test('paired native night audit validates the declared paid piece count, not a guessed fixture size',()=>{
 const directory=mkdtempSync(join(tmpdir(),'wild-guardians-pair-count-'));
 const base='docs/qa/integrated-spiritual-survival/',args=['tools/audit-native-canyon-night-defense-pair.mjs',base+'funded-canyon-small-night-v1.json',base+'funded-canyon-small-no-wall-night-v1.json'];
 const accepted=join(directory,'accepted.json');
 const valid=spawnSync(process.execPath,[...args,accepted,'31'],{encoding:'utf8',timeout:30000});
 assert.equal(valid.status,0,valid.stderr);
 const result=JSON.parse(readFileSync(accepted));
 assert.equal(result.expectedWallPieces,31);assert(result.sameFullCropState&&result.sameEngineSources&&result.sameRngAndNightPlan);
 assert.deepEqual(result.rows.map(r=>r.cropsDestroyed),[0,1]);
 const rejected=join(directory,'rejected.json');
 const invalid=spawnSync(process.execPath,[...args,rejected,'32'],{encoding:'utf8',timeout:30000});
 assert.notEqual(invalid.status,0);assert.equal(existsSync(rejected),false);
 // Small audit outputs remain in the uniquely created temporary directory;
 // no recursive deletion or workspace-file mutation is needed.
});
