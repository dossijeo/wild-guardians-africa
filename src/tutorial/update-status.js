import {TUTORIAL_IDS} from './messages.js';
const allowed=new Set(TUTORIAL_IDS);
export function validateTutorialUpdateStatus(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2||!Object.hasOwn(value,'needed')||!Object.hasOwn(value,'narrated')||typeof value.needed!=='boolean'||value.narrated!==null&&(typeof value.narrated!=='string'||!allowed.has(value.narrated)))throw TypeError('Invalid tutorial update status');
 return value;
}
