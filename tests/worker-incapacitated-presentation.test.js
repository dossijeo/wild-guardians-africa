import test from 'node:test';
import assert from 'node:assert/strict';
import {isWorkerIncapacitatedPresentation} from '../src/rendering/worker-incapacitated-presentation.js';

test('incapacitated baked presentation excludes physical and recovery phases',()=>{
 const worker={status:'incapacitated',incapacitated:true};
 assert.equal(isWorkerIncapacitatedPresentation(worker),true);
 for(const change of [{status:'home'},{incapacitated:false},{fallRemaining:.1},{recovery:{}},{recoveryExitRemaining:.1}])assert.equal(isWorkerIncapacitatedPresentation({...worker,...change}),false);
});
