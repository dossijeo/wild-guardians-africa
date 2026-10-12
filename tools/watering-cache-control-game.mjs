import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// The reference redirects only work-points; every other simulation dependency
// remains the current native module. No source file or global engine is patched.
export async function uncachedWateringControl(){
 const gameUrl=new URL('../src/simulation/game.js',import.meta.url),source=readFileSync(gameUrl,'utf8');
 assert(!source.includes('import.meta'),'Control adapter requires module-relative runtime expressions to be absent');
 const referenceUrl=new URL('../tests/fixtures/watering-route-v1-reference.mjs',import.meta.url);
 const controlSource=source.replace(/from '([^']+)'/g,(_match,spec)=>`from '${spec==='../world/work-points.js'?referenceUrl.href:spec.startsWith('.')?new URL(spec,gameUrl).href:spec}'`);
 return {engine:await import('data:text/javascript;base64,'+Buffer.from(controlSource).toString('base64')),source};
}
