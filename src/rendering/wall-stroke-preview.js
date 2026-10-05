import {Matrix4,Vector3} from 'three';
import {renderedTerrainSurface} from './terrain-surface.js';
// The Bastion lab draws its guide in screen space: five-pixel pale outline,
// two-pixel dashed green centre, round ends. Terrain cannot hide this guide.
export class WallStrokePreview{
 constructor(canvas){
  this.source=canvas;this.points=[];this.terrainPoints=[];this.vector=new Vector3();this.cameraWorld=new Matrix4();this.cameraProjection=new Matrix4();this.dirty=true;this.canvas=document.createElement('canvas');
  this.canvas.setAttribute('aria-hidden','true');this.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;display:none';
  canvas.parentElement.append(this.canvas);this.context=this.canvas.getContext('2d');
 }
 showScreen(points){this.show(points);this.screenSpace=true;}
 show(points){this.screenSpace=false;this.points=points;this.dirty=true;this.canvas.style.display=points.length?'block':'none';}
 render(camera,field){
  if(!this.points.length)return;
  const {width,height}=this.source.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1),c=this.context;
  if(this.canvas.width!==Math.round(width*ratio)||this.canvas.height!==Math.round(height*ratio)){this.canvas.width=Math.round(width*ratio);this.canvas.height=Math.round(height*ratio);this.dirty=true;}
  if(this.screenSpace){
   const {left,top}=this.source.getBoundingClientRect();
   if(!this.dirty&&this.width===width&&this.height===height&&this.ratio===ratio&&this.left===left&&this.top===top)return;
   this.width=width;this.height=height;this.ratio=ratio;this.left=left;this.top=top;this.dirty=false;
   this.paint(this.points.map(([x,y])=>({x:x-left,y:y-top})),width,height,ratio);return;
  }
  camera.updateMatrixWorld();
  if(this.terrainField!==field){this.terrainField=field;this.terrainPoints=[];this.dirty=true;}
  if(!this.dirty&&this.width===width&&this.height===height&&this.ratio===ratio&&this.cameraWorld.equals(camera.matrixWorld)&&this.cameraProjection.equals(camera.projectionMatrix))return;
  this.cameraWorld.copy(camera.matrixWorld);this.cameraProjection.copy(camera.projectionMatrix);this.width=width;this.height=height;this.ratio=ratio;this.dirty=false;

  const projected=this.points.map(([x,z],i)=>{
   let p=this.terrainPoints[i];if(!p||p.x!==x||p.z!==z)p=this.terrainPoints[i]={x,z,y:renderedTerrainSurface(field,x,z)+.075};
   this.vector.set(x,p.y,z).project(camera);return {x:(this.vector.x+1)*width/2,y:(1-this.vector.y)*height/2};
  });this.terrainPoints.length=this.points.length;
  this.paint(projected,width,height,ratio);
 }
 paint(projected,width,height,ratio){
  const c=this.context;c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,width,height);
  c.beginPath();projected.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.lineJoin='round';c.lineCap='round';c.setLineDash([]);c.lineWidth=5;c.strokeStyle='#fffdf7b3';c.stroke();c.lineWidth=2;c.strokeStyle='#49623d';c.setLineDash([6,5]);c.stroke();c.setLineDash([]);
  for(const p of [projected[0],projected.at(-1)]){c.beginPath();c.arc(p.x,p.y,4,0,Math.PI*2);c.fillStyle='#49623d';c.fill();c.strokeStyle='#f4f3e7';c.lineWidth=2;c.stroke();}
 }
 dispose(){this.canvas.remove();this.points=[];this.terrainPoints=[];this.terrainField=null;}
}
