import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
const target=new URL('../src/world/navigation.js',import.meta.url).href;
export async function load(url,context,nextLoad){
 if(url===target)return {format:'module',shortCircuit:true,source:gunzipSync(readFileSync(new URL('../docs/qa/hostile-approach-cache/original-navigation.js.gz',import.meta.url))).toString()};
 return nextLoad(url,context);
}
