import {writeFile} from 'node:fs/promises';
import factory from '../../public/wild-engine/spatial-threaded.mjs';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
import {exerciseThreadGrowth} from './spatial-thread-growth-case.mjs';
const report=await exerciseThreadGrowth(await createThreadedSpatialWorld(factory));
await writeFile('docs/qa/wild-engine-pthreads/thread-growth.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
