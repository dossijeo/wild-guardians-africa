import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
// Execute the production presentation methods with DOM/media edges replaced;
// no WebGL context or browser playback is needed for this close policy.
const source=readFileSync(new URL('../src/ui/guardian.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export class NativeGuardian','class NativeGuardian');
function fixture(status='loading'){
 let closed=0,ended;const classes={contains:()=>false,remove(){},add(){},toggle(){}};
 const context=vm.createContext({document:{hidden:false},performance:{now:()=>100000},window:{},guardianCopy:text=>text,spiritVoice:()=>({}),GESTURE_MIN_SECONDS:{speak:5.8}});
 vm.runInContext(source+';globalThis.Guardian=NativeGuardian;',context);
 const actor=Object.create(context.Guardian.prototype);
 Object.assign(actor,{key:null,disposed:false,age:100,duration:1,lastStamp:0,lifecycle:{phase:'reading',open(){},advance(){}},root:{classList:classes,setAttribute(){},removeAttribute(){},dataset:{}},message:{setAttribute(){}},button:{style:{}},closeButton:{},skipButton:{},resize(){},draw(){},voice:{status,duration:null,play(_record,callback){ended=callback;},stop(){}},hide(){closed++;this.key=null;}});
 return {actor,closed:()=>closed,ended:()=>ended()};
}
test('closeAfter cannot retire loading or playing voice on a caption timer; real ended closes once',()=>{
 for(const status of ['loading','playing']){
  const f=fixture(status);f.actor.show({key:'reserve',text:'Reserva',closeAfter:true});f.actor.age=100;f.actor.update();assert.equal(f.closed(),0);
  f.ended();assert.equal(f.closed(),1);
 }
});
test('a superseded ended callback cannot close the next presentation',()=>{
 const f=fixture('playing');f.actor.show({key:'old',text:'Uno',closeAfter:true});f.actor.key='new';f.ended();assert.equal(f.closed(),0);
});
test('closeAfter retains timed fallback when media is unavailable or no voice exists',()=>{
 for(const status of ['fallback',null]){
  const f=fixture(status);if(status===null)f.actor.voice=null;f.actor.closeAfter=true;f.actor.update();assert.equal(f.closed(),1);
 }
});
