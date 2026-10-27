// Optional visual laboratory recipe; existing textures and meshes only.
export function volcanicRockEnabled(search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('volcanicRock')==='layered';
}
export function patchVolcanicRock(source,enabled){
 if(!enabled)return source;
 const ash='reliefMask*=1.-qaAsh*.85;';
 const from=`float depth=0.;
  for(int k=0;k<8;k++){
   float h=textureGrad(uGroundARH,p,dx,dy).b;
   if(depth>=1.-h)break;
   p-=stepUV;depth+=.125;
  }
  uv=p;`;
 const to=`float depth=0.;vec2 previousP=p;float previousError=0.;
  for(int k=0;k<8;k++){
   float h=textureGrad(uGroundARH,p,dx,dy).b;
   float error=1.-h-depth;
   if(error<=0.){if(k>0&&rock)p=mix(previousP,p,clamp(previousError/max(previousError-error,.00001),0.,1.));break;}
   previousP=p;previousError=error;
   p-=stepUV;depth+=.125;
  }
  uv=p;`;
 if(!source.includes(ash)||!source.includes(from))throw Error('Volcanic rock recipe anchors missing');
 return source.replace(ash,'qaAsh*=mix(1.,.25,smoothstep(.48,.85,textureGrad(uGroundARH,uv,dx,dy).b));'+ash).replace(from,to);
}

export function volcanicDepositsEnabled(search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);return volcanicRockEnabled(search)&&q.get('volcanicDeposits')==='broad';
}
// Applied after the existing ash/rock recipe. Reuses its masks and samples.
export function patchVolcanicDeposits(source,enabled){
 if(!enabled)return source;
 const edits=[['smoothstep(.39,.66,','smoothstep(.30,.60,'],['vec3(.30,.285,.265)','vec3(.39,.32,.245)'],['mix(1.,.25,smoothstep','mix(1.,.55,smoothstep']];
 for(const [from,to] of edits){if(!source.includes(from))throw Error('Volcanic deposits anchor missing: '+from);source=source.replaceAll(from,to);}
 return source;
}
