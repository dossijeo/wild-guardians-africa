// Secondary wind layered after GuardianPose restores the authored pose.
// Roots stay restrained; delayed distal rotations make a travelling cloth wave.
export function spellWindBinding(bone){
 const name=bone.name.replaceAll('.','');
 const mantle=/^Mantle([FB][LR])([012])$/.exec(name);
 if(mantle){const depth=Number(mantle[2]),panel=['FL','FR','BL','BR'].indexOf(mantle[1]);return {bone,kind:'cloth',amplitude:[.045,.24,.48][depth],phase:panel*.58-depth*.85,side:mantle[1].endsWith('L')?-1:1};}
 const feather=/^Feather(\d+)(Tip)?$/.exec(name);
 if(feather)return {bone,kind:'feather',amplitude:feather[2]?.32:.13,phase:Number(feather[1])*.67-(feather[2]?.65:0),side:1};
 const wood=/^Wood(\d+)$/.exec(name);
 if(wood)return {bone,kind:'wood',amplitude:.22,phase:Number(wood[1])*.83,side:1};
 return null;
}
export function applySpellWind(bindings,age){
 const t=Math.max(0,age),ramp=Math.min(1,t/.22),fade=1-Math.min(1,Math.max(0,(t-1.65)/.55));
 const envelope=ramp*ramp*(3-2*ramp)*fade;
 const arrival=1+.55*Math.exp(-(((t-.35)/.24)**2));
 for(const b of bindings){
  const speed=b.kind==='wood'?3.7:b.kind==='feather'?6.2:5.1;
  const wave=Math.sin(t*speed+b.phase),secondary=Math.sin(t*speed*1.63+b.phase*.7);
  const amplitude=b.amplitude*envelope*arrival;
  b.bone.rotation.x+=amplitude*(wave+.18*secondary);
  b.bone.rotation.z+=amplitude*(b.kind==='cloth'?.5:.32)*Math.cos(t*speed+b.phase-.6)*b.side;
 }
}
