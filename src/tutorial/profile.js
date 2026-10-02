import {TUTORIAL_IDS} from './messages.js';
const key='wild-guardians:tutorial-profile:v1',allowed=new Set(TUTORIAL_IDS);
export class TutorialProfile {
  constructor(storage){this.storage=storage;}
  read(){
    try{
      const data=JSON.parse(this.storage.getItem(key));
      return new Set(data?.version===1&&Array.isArray(data.seen)?data.seen.filter(id=>allowed.has(id)):[]);
    }catch{return new Set();}
  }
  has(id){return this.read().has(id);}
  record(id){
    if(!allowed.has(id))throw new Error('Mensaje tutorial desconocido');
    const seen=this.read();seen.add(id);this.storage.setItem(key,JSON.stringify({version:1,seen:[...seen].sort()}));
  }
  get basicCompleted(){return this.has('basic.complete');}
}
