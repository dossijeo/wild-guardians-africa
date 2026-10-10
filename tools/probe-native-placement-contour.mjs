import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from './check_opening.mjs';
import {closedDefenseContours} from './native-closed-defense-policy.mjs';
import {wallPlacementContour} from './native-wall-placement-contour.mjs';
import {shoreDefenseContours} from './native-shore-defense-contour.mjs';
import {wallStroke} from '../src/world/wall-layout.js';
import * as Game from '../src/simulation/game.js';
const [input,output,mode='placement']=process.argv.slice(2);if(!input||!output||existsSync(output)||!['placement','shore'].includes(mode))throw Error('Requires retained snapshot, fresh output, placement|shore mode');
const s=deserialize(gunzipSync(readFileSync(input)).toString()),{nav}=createOpeningWorld({seed:s.seed,biome:s.biome,culture:s.culture,terrainVersion:s.terrainVersion});nav.setState(s);const before=serialize(s),rows=[];
const candidates=mode==='shore'?[2,3,4].flatMap(padding=>shoreDefenseContours(s,nav,{padding}).candidates):closedDefenseContours(s);
for(const c of candidates){
 const at=performance.now(),route=mode==='shore'?{candidate:c,reason:'shore-envelope'}:wallPlacementContour(s,nav,c),quote=route.candidate?Game.quoteWallChain(s,'zarzas',route.candidate.points,nav,{smooth:false,snap:false}):null;
 const omitted=quote?wallStroke(route.candidate.points,s.structures,{smooth:false,snap:false}).filter(slot=>!quote.pieces.some(p=>Math.hypot(p.x-slot.x,p.z-slot.z)<1e-6)).map(slot=>({x:slot.x,z:slot.z,check:nav.wallPlacement({kind:'wall',material:'zarzas',gate:false,x:slot.x,z:slot.z,yaw:-slot.angle,baseScaleX:slot.scaleX,status:'intact'})})):[];
 rows.push({...route,milliseconds:performance.now()-at,omitted,quote:quote?{count:quote.pieces.length,expected:wallStroke(route.candidate.points,s.structures,{smooth:false,snap:false}).length,gates:quote.gates,cost:quote.cost}:null});
 if(quote&&quote.pieces.length===rows.at(-1).quote.expected)break;
}
if(serialize(s)!==before)throw Error('Read-only planning modified native snapshot');
const sourceFiles=['tools/probe-native-placement-contour.mjs','tools/native-wall-placement-contour.mjs','tools/native-shore-defense-contour.mjs','src/world/navigation.js'];
writeFileSync(output,JSON.stringify({input,inputSha256:createHash('sha256').update(readFileSync(input)).digest('hex'),mode,sourceHashes:Object.fromEntries(sourceFiles.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),rows,scope:'Prospective native placement only, no paid protection or campaign outcome'},null,2)+'\n');console.log(JSON.stringify(rows.map(({candidate,omitted,...r})=>({...r,omitted:omitted?.length}))));
