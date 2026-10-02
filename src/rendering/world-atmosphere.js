// Defaults and palette recipe from Bioma Lab V4.0, render() and initial state.
export const WATER_DEFAULTS=Object.freeze({speed:.65,scale:.55,amplitude:.72,strokeWidth:1.08,handmade:.52});
const hex=value=>[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)/255);
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export function waterPalette(color,lava=false){
  const water=hex(color);
  if(lava)return [hex('#421d16'),hex('#b43d0b'),water,hex('#ffe284')];
  const deep=mix(water,hex('#157986'),.28),mid=mix(water,hex('#38bcc5'),.42),light=mix(mid,hex('#7fe3d6'),.36);
  return [deep,mid,light,mix(light,hex('#f0f2d7'),.58)];
}
export function waterSeed(seed){const value=(Number(seed)>>>0)||42;return [(value%1031)*.031,((value>>>12)%937)*.037];}
export function waterTime(elapsed){return elapsed*WATER_DEFAULTS.speed;}
