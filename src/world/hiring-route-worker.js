import {computeHiringRoutes} from './compute-hiring-routes.js';
self.onmessage=({data})=>{
 try{self.postMessage(computeHiringRoutes(data));}
 catch{self.postMessage({token:data.token,error:true});}
};
