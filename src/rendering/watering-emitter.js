// Prepared from the four original Water clips by prepare_watering_emitters.mjs.
// Runtime only interpolates; it never clones or samples another animated rig.
export function createWateringEmitter(data){
  const {frames,positions,directions}=data??{};
  if(!Number.isInteger(frames)||frames<1||![positions,directions].every(a=>Array.isArray(a)&&a.length===(frames+1)*3&&a.every(Number.isFinite)))throw new Error('Recorrido de regadera inválido');
  return (fraction,origin,outward)=>{
    const t=Math.max(0,Math.min(1,fraction))*frames,a=Math.min(frames-1,Math.floor(t)),mix=t-a;
    for(let k=0;k<3;k++){origin.setComponent(k,positions[a*3+k]*(1-mix)+positions[(a+1)*3+k]*mix);outward.setComponent(k,directions[a*3+k]*(1-mix)+directions[(a+1)*3+k]*mix);}
    outward.normalize();return origin;
  };
}
