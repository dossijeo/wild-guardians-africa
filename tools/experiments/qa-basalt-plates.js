import * as THREE from 'three';

// Replace the image source of the three owned ground textures, retaining their
// existing samplers, dimensions and GL objects. Cached original sources remain
// immutable. QA retains decoded original images, so browser RAM is not reduced.
export async function applyBasaltPlates(world){
 if(world.nav.field.c.biome!=='volcanoes')return {applied:false,control:true};
 const audit=[];
 for(const [i,role] of ['base','normal','arh'].entries()){
  const url='/docs/qa/global-visual-lab/basalt-plates/basalt-'+role+'.png';
  const image=new Image();image.src=url;await image.decode();
  if(image.width!==1024||image.height!==1024)throw Error('Unexpected basalt map dimensions');
  const texture=world.biomeGround.textures[i];
  audit.push({role,before:[texture.image.width,texture.image.height],after:[image.width,image.height],url});
  texture.source=new THREE.Source(image);texture.needsUpdate=true;
 }
 return {applied:true,maps:audit,newTextureObjects:0,newGeometry:0,estimatedReplacementRgba8MipBytes:16777216,decodedCandidateImageBytes:12582912};
}
