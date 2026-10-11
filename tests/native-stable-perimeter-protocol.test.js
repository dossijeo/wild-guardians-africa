import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNativeCampaignArgs,nativeCampaignProvenance} from '../tools/run_native_campaign.mjs';
import {createNativeFundedDefensePolicy} from '../tools/native-funded-defense-policy.mjs';
test('stable prospective plan QA is opt-in and both loaded modules are hashed',()=>{
 assert.equal(parseNativeCampaignArgs(['--out','fixture']).perimeterQa,'legacy');
 const options=parseNativeCampaignArgs(['--out','fixture','--defense-policy','shore','--perimeter-qa','stable-plan-v5']);
 assert.equal(options.perimeterQa,'stable-plan-v5');
 const provenance=nativeCampaignProvenance(options);assert.equal(provenance.protocol.perimeterQa,'stable-plan-v5');
 for(const path of ['tools/native-stable-plan-perimeter-proof.mjs','tools/stable-prospective-wall-plan-candidate.mjs'])assert.match(provenance.sourceHashes[path],/^[a-f0-9]{64}$/);
 assert.equal(createNativeFundedDefensePolicy({perimeterQa:'stable-plan-v5'}).report().perimeterQa,'stable-plan-v5');
 assert.throws(()=>parseNativeCampaignArgs(['--out','fixture','--perimeter-qa','unknown']));
 assert.throws(()=>createNativeFundedDefensePolicy({perimeterQa:'unknown'}));
});
