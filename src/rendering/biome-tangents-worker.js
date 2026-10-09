import {prepareBiomeTangents} from './biome-tangents.js';
self.onmessage=event=>{try{const tangents=prepareBiomeTangents(event.data.buffer,event.data.assets);self.postMessage({tangents},tangents.flat().map(value=>value.buffer));}catch(error){self.postMessage({error:error.message??String(error)});}};
