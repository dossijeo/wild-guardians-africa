import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const target=pathToFileURL(resolve('src/simulation/locomotion.js')).href;
const source=readFileSync(new URL('./urgency-reference-source.txt',import.meta.url),'utf8');
export async function load(url,context,nextLoad){if(url===target)return {format:'module',source,shortCircuit:true};return nextLoad(url,context);}
