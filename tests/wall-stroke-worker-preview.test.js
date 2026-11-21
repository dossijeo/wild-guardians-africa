import test from 'node:test';
import assert from 'node:assert/strict';
import {WallStrokePreview} from '../src/rendering/wall-stroke-preview.js';

test('screen-space wall guide paints immediately without a WebGL frame',t=>{
 const previous={document:globalThis.document,ratio:globalThis.devicePixelRatio};
 t.after(()=>{globalThis.document=previous.document;globalThis.devicePixelRatio=previous.ratio;});
 let paints=0;const context=new Proxy({clearRect:()=>paints++},{get:(o,k)=>o[k]??(()=>{})});
 const overlay={style:{},setAttribute(){},getContext:()=>context,remove(){}};
 globalThis.document={createElement:()=>overlay};globalThis.devicePixelRatio=2;
 const preview=new WallStrokePreview({getBoundingClientRect:()=>({left:20,top:30,width:100,height:100}),parentElement:{append(){}}});
 preview.showScreen([[30,45],[90,95]]);assert.equal(paints,1);
 preview.showScreen([[30,45],[95,97]]);assert.equal(paints,2);
 preview.showScreen([]);assert.equal(overlay.style.display,'none');preview.dispose();
});
