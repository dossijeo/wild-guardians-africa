// Isolated CPU-profiler entry point for a retained native campaign snapshot.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {nativeCameraPose} from '../../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../../src/world/active-region.js';
import * as Game from '../../src/simulation/game.js';

const [input,secondsText='5']=process.argv.slice(2);
if(!input)throw Error('Use snapshot.json.gz [seconds]');
const seconds=Number(secondsText);
if(!Number.isFinite(seconds)||seconds<=0||seconds>10)throw Error('Invalid seconds');
const state=deserialize(gunzipSync(readFileSync(input)).toString('utf8'));
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`,'utf8')).profile;
const nav=new Navigation(state.seed,state.biome,profile);
nav.setState(state);
const center=state.structures.find(x=>x.kind==='center');
const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);
nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
const started=performance.now();
Game.tick(state,seconds,nav);
console.log(JSON.stringify({milliseconds:performance.now()-started,hash:createHash('sha256').update(serialize(state)).digest('hex'),day:state.day,time:state.time}));
