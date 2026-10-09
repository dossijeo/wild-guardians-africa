import test from 'node:test';
import assert from 'node:assert/strict';
import {showLoadingFailure,clearLoadingFailure} from '../src/ui/loading-failure.js';
function documentStub(){
 const doc={};doc.createElement=tag=>({tag,className:'',children:[],attributes:{},setAttribute(key,value){this.attributes[key]=value;},append(...children){this.children.push(...children);for(const child of children)child.parent=this;},remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}});
 doc.body=doc.createElement('body');doc.querySelector=()=>doc.body.children.find(child=>child.className.includes('loading-failure'));return doc;
}
test('load failure remains explicit and dismissible in both locales without interpreting error HTML',()=>{
 for(const locale of ['es-ES','en-US']){const doc=documentStub(),message='<img src=x onerror=attack()>',notice=showLoadingFailure(message,{document:doc,locale});assert.equal(notice.attributes.role,'alert');assert.equal(notice.children[1].textContent,message);assert.equal(notice.children[1].innerHTML,undefined);assert.equal(notice.children[2].textContent,locale==='es-ES'?'Cerrar':'Dismiss');assert.equal(doc.body.children.length,1);notice.children[2].onclick();assert.equal(doc.body.children.length,0);assert.equal(notice.children[2].onclick,null);}
});
test('replacement and next-attempt cleanup remove only the loading notice and are idempotent',()=>{
 const doc=documentStub(),ordinary=doc.createElement('div');ordinary.className='error-banner';doc.body.append(ordinary);showLoadingFailure('first',{document:doc});const current=showLoadingFailure('second',{document:doc});assert.equal(doc.body.children.length,2);assert.equal(current.children[1].textContent,'second');clearLoadingFailure(doc);clearLoadingFailure(doc);assert.deepEqual(doc.body.children,[ordinary]);
});
