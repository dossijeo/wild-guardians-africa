import {Navigation} from './navigation.js';
import {findInitialLocation} from './villages.js';
self.onmessage=event=>{try{const {config,profile,payload}=event.data,nav=new Navigation(config.seed,config.biome,profile);nav.config={...config};const site=findInitialLocation(nav,payload);self.postMessage({site,config:nav.config});}catch(error){self.postMessage({error:error.message??String(error)});}};
