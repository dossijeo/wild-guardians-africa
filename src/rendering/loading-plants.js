import {cropSpec} from '../simulation/rules.js';
const ease=t=>t*t*(3-2*t);
export class LoadingPlants {
  constructor({capacity=18,radius=4.3,spacing=1.5,catchupSeconds=1}={}) {
    this.capacity=capacity;this.radius=radius;this.spacing=spacing;this.catchupSeconds=catchupSeconds;this.time=0;this.progress=0;this.ready=false;this.accepting=true;this.plants=[];
    for(const [x,z] of [[-1.7,-.8],[.8,-1.5],[1.8,1.2],[-1.2,1.5]])this.plant(x,z,{initial:true});
  }
  plant(x,z,{initial=false}={}) {
    if(!this.accepting||!Number.isFinite(x)||!Number.isFinite(z)||this.plants.length>=this.capacity||Math.hypot(x,z)>this.radius||this.plants.some(p=>Math.hypot(p.x-x,p.z-z)<this.spacing))return null;
    const id='loading-maize-'+(this.plants.length+1),p={id,species:'maiz',x,z,rotation:this.plants.length*2.399963229728653,growth:0,born:initial?-this.catchupSeconds:this.time};this.plants.push(p);return p;
  }
  update(dt,target,{ready=false}={}) {
    if(!Number.isFinite(dt)||dt<0||!Number.isFinite(target))throw Error('Invalid loading animation time/progress');
    this.time+=dt;this.ready||=ready;
    target=Math.max(this.progress,Math.min(this.ready?1:.99,Math.max(0,target)));
    this.progress=Math.min(target,this.progress+dt/.35);
    const duration=cropSpec('maiz').growth_seconds;
    for(const plant of this.plants){const age=Math.min(1,Math.max(0,(this.time-plant.born)/this.catchupSeconds));plant.growth=duration*this.progress*ease(age);}
  }
  stopPlanting(){this.accepting=false;}
  get mature(){return this.ready&&this.progress===1&&this.plants.every(p=>p.growth===cropSpec('maiz').growth_seconds);}
}
