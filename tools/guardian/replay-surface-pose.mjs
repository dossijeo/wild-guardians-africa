import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
import {replaySurfacePose} from '../../tests/browser/guardian-surface-pose.js';
const bytes=fs.readFileSync(process.argv[2]);const json=JSON.parse(bytes[0]===31?gunzipSync(bytes):bytes),capture=json.report?.surfaceCapture??json;
const model=await actorGeometry('public'+ANIMAL_ACTIONS.animals[capture.species].url);new BeastRagdollBinding(model,{species:capture.species});
const result=replaySurfacePose(model,capture);console.log(JSON.stringify({species:capture.species,recorded:capture.minimum,...result,difference:result.minimum-capture.minimum},null,2));
if(Math.abs(result.minimum-capture.minimum)>1e-6)process.exitCode=1;
