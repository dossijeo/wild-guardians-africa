import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {PerspectiveCamera} from 'three';
import {guardianPlacement} from '../src/rendering/guardian-placement.js';
const reference=process.argv[2]??'89c2bae4c';
const source=execFileSync('git',['show',reference+':src/rendering/guardian-placement.js'],{encoding:'utf8'}).replace("from 'three'",`from '${pathToFileURL(resolve('node_modules/three/build/three.module.js')).href}'`);
const previous=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).guardianPlacement;
let oldRays=0,newRays=0,oldOccupancy=0,newOccupancy=0,cases=0;const differences=[];
for(const height of [2,3,4,5])for(const yaw of [0,.7,1.4,2.1,2.8,3.5,4.2,4.9])for(const crowded of [false,true]){
 const camera=new PerspectiveCamera(42,16/9,.1,500);camera.position.set(Math.sin(yaw)*22,16,Math.cos(yaw)*22);camera.lookAt(0,3,0);camera.updateMatrixWorld(true);
 const args={target:{x:0,z:0,radius:.7},camera,nav:{field:{surface:()=>0},placement:()=>({valid:!crowded})},state:{plants:[],workers:[],structures:[],raid:{animals:[]}},occupied:(x,y,z)=>x<-.5&&y<height+1};
 const hidden=(x,y,z)=>y<height||Math.abs(x)<.6&&z<0;
 const expected=previous({...args,occupied:(...v)=>{oldOccupancy++;return args.occupied(...v);},occluded:(...v)=>{oldRays++;return hidden(...v);}}),actual=guardianPlacement({...args,occupied:(...v)=>{newOccupancy++;return args.occupied(...v);},occluded:(...v)=>{newRays++;return hidden(...v);}});
 cases++;if(JSON.stringify(expected)!==JSON.stringify(actual))differences.push({height,yaw,crowded,expected,actual});
}
console.log(JSON.stringify({reference,cases,oldRays,newRays,oldOccupancy,newOccupancy,differences},null,2));if(differences.length)process.exitCode=1;
