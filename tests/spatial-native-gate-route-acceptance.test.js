import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runNativeGateRouteAcceptance} from './helpers/native-gate-route-acceptance.js';

test('e-R2 native acceptance replays deterministically: two closed gates, suspension, rejected mutation-bound resume, readmission and arrival',()=>{
 const first=runNativeGateRouteAcceptance(),second=runNativeGateRouteAcceptance();assert.deepEqual(second,first);
 const recorded=JSON.parse(readFileSync(new URL('../docs/guardian/performance/native-gate-crossing-resume-20261109.json',import.meta.url),'utf8'));
 assert.deepEqual(first,recorded.result,'committed native acceptance trace matches the current binary and commands');
});
