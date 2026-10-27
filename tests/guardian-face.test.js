import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sampleVisemes,GuardianFace,VISEMES,blinkAt} from '../src/ui/guardian-face.js';
const cues=[{start:0,end:.2,value:'X'},{start:.2,end:.4,value:'A'},{start:.4,end:.8,value:'D'},{start:.8,end:1,value:'X'}];
test('audio-clock sampling is normalized and continuous across cues, seeks and low FPS',()=>{
 for(let t=0;t<1;t+=.001){const w=sampleVisemes(cues,t,1);assert.ok(Math.abs(Object.values(w).reduce((a,b)=>a+b,0)-1)<1e-9);assert.ok(Object.values(w).every(v=>v>=0&&v<=1));}
 const a=sampleVisemes(cues,.4-1e-7,1),b=sampleVisemes(cues,.4+1e-7,1);assert.ok(Math.abs(a.D-b.D)<.0001);
 for(const t of [.65,.22,.9,.65])assert.deepEqual(sampleVisemes(cues,t,1),sampleVisemes(cues,t,1));
 assert.equal(sampleVisemes(cues,1,1).X,1);assert.equal(sampleVisemes(null,0,1).X,1);
});
test('short, repeated and missing cues remain finite',()=>{
 for(const data of [[{start:0,end:.001,value:'B'},{start:.001,end:.002,value:'B'}],[{start:.1,end:.2,value:'D'}]])for(const t of [0,.0005,.001,.002,.15,.25]){const w=sampleVisemes(data,t,1);assert.ok(Object.values(w).every(Number.isFinite));assert.ok(Math.abs(Object.values(w).reduce((a,b)=>a+b,0)-1)<1e-9);}
});
test('a late language response cannot animate the newer recording; pausing preserves the pose',async()=>{
 const dictionary=Object.fromEntries([...VISEMES.map(v=>'viseme_'+v),'blink_L','blink_R'].map((v,i)=>[v,i]));const mesh={morphTargetDictionary:dictionary,morphTargetInfluences:Array(11).fill(0)};const pending=[];
 const face=new GuardianFace({traverse:fn=>fn(mesh)},{fetchJson:url=>new Promise(resolve=>pending.push(resolve))});
 const first=face.setRecord({id:'ES_01',path:'es.ogg'}),second=face.setRecord({id:'EN_01',path:'en.ogg'});
 pending[1]({id:'EN_01',audio:'en.ogg',duration:1,mouthCues:cues});await second;pending[0]({id:'ES_01',audio:'es.ogg',duration:1,mouthCues:[]});await first;assert.equal(face.data.id,'EN_01');
 const audio={currentTime:.6,paused:true,ended:false};face.update(audio,1,{blink:0});const pose=[...mesh.morphTargetInfluences];face.update(audio,50,{blink:0});assert.deepEqual(mesh.morphTargetInfluences,pose);assert.equal(pose[dictionary.viseme_D],1);
 face.update(null,2,{blink:0});assert.equal(mesh.morphTargetInfluences[dictionary.viseme_X],1);face.dispose();assert.ok(mesh.morphTargetInfluences.every(v=>v===0));
});
test('all 54 real recordings have bounded Rhubarb cues and matching source identities',()=>{
 const records=JSON.parse(fs.readFileSync('content/manifests/spirit-voices.json')).records;assert.equal(records.length,54);
 for(const record of records){const data=JSON.parse(fs.readFileSync(`public/content/guardian/lipsync/${record.id}.json`));assert.equal(data.audio,record.path);assert.equal(data.sourceSha256,record.sha256);assert.equal(data.recognizer,record.language==='es'?'phonetic':'pocketSphinx');let end=0;for(const c of data.mouthCues){assert.ok(VISEMES.includes(c.value));assert.ok(c.start>=end-.011);assert.ok(c.end>=c.start);assert.ok(c.end<=data.duration+.03);end=c.end;}assert.ok(Math.abs(end-data.duration)<.04);}
});
test('blink closes fully and returns to rest',()=>{assert.equal(blinkAt(3.1),1);assert.equal(blinkAt(0),0);assert.ok(blinkAt(3.05)>0&&blinkAt(3.05)<1);});
