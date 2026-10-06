import {buildFarSceneData,farSceneTransferables} from './far-scene-data.js';
self.onmessage=({data:request})=>{
 try{const start=performance.now(),data=buildFarSceneData(request);self.postMessage({data,buildMs:performance.now()-start},farSceneTransferables(data));}
 catch(error){self.postMessage({error:String(error.stack??error)});}
};
