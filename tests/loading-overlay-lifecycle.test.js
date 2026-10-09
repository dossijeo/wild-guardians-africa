import test from 'node:test';
import assert from 'node:assert/strict';
import {LoadingOverlay} from '../src/ui/loading-overlay.js';

test('overlay owns resize observation and controls, while retained HUD images remain borrowed',()=>{
 const make=()=>({style:{},textContent:'',getAttribute(name){return this[name];},setAttribute(name,value){this[name]=value;}});
 const title=make(),percent=make(),bar=make(),track=make(),help=make(),label=make(),cancel=make(),wood=make();
 track.firstElementChild=bar;cancel.querySelector=()=>label;cancel.clientWidth=wood.clientWidth=0;
 const selectors={'.interactive-loading-title':title,'#loading-progress':percent,'.interactive-loading-track':track,'.interactive-loading-help':help,'#loading-cancel':cancel,'.interactive-loading-wood':wood};
 const element={dataset:{},querySelector:key=>selectors[key],remove(){this.removed=true;}};
 let callback,disconnected=0;const observed=[],images={frame_center:{src:'/borrowed.webp'}};
 const overlay=new LoadingOverlay({frameImages:images,document:{createElement:()=>element},observeResize:fn=>{callback=fn;return {observe:host=>observed.push(host),disconnect:()=>disconnected++};}});
 assert.deepEqual(observed,[wood,cancel]);assert.equal(help.style.backgroundImage,'url("/borrowed.webp")');
 overlay.render({pending:['crops'],progress:.6,ready:false,unchangedFor:0},.6);
 assert.equal(label.textContent,'Cancel');assert.equal(cancel.textContent,'');assert.equal(track['aria-valuenow'],'60');
 overlay.dispose();overlay.dispose();assert.equal(disconnected,1);assert.equal(cancel.onclick,null);assert.equal(element.removed,true);assert.equal(overlay.frameImages,null);
 assert.doesNotThrow(callback);assert.equal(images.frame_center.src,'/borrowed.webp');
});
