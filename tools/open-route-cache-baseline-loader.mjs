import {readFileSync} from 'node:fs';
export async function load(url,context,next){
 if(url.endsWith('/tools/static-animal-certificate-cache.mjs'))return {format:'module',shortCircuit:true,source:readFileSync(new URL('../docs/qa/static-open-route-cache/original-static-animal-certificate.mjs.txt',import.meta.url),'utf8')};
 return next(url,context);
}
