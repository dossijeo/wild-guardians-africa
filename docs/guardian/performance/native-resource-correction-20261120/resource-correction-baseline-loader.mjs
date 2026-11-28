import {execFileSync} from 'node:child_process';
const paths=process.env.BASELINE_HOST?['src/rendering/remote-webgpu-host.js']:['src/world/native-task-action-presentation.js','src/world/native-task-consequence.js','src/world/native-task-settlement.js'];
const sources=new Map(paths.map(p=>[new URL('../'+p,import.meta.url).href,execFileSync('git',['show','bac8fe876:'+p],{encoding:'utf8'})]));
export async function load(url,context,next){if(sources.has(url))return {format:'module',source:sources.get(url),shortCircuit:true};return next(url,context);}
