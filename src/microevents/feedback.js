// Original procedural VFX reuse the authored low-poly atlas; no external assets.
const cue=(vfx,sound=null,contactSound=null)=>Object.freeze({vfx,sound,contactSound});
const groups={
 glint:['seeds','beetle','feather','goldenleaves','rareseed','grain'],
 magic:['fireflies','spirit','star','pollen','rainbow'],
 feather:['birds','butterflies'],
 dust:['locusts','termites','weeds','ants','burrow','dustdevil','pathleaves','debris','insects','snake','thornseeds','vortex','gust','branch','fallingdebris'],
 mist:['raincloud','dew','fog','spores','web','heat','smoke','storm','lightning','fire'],
 splash:['hail','flower']
};
const feedback={};for(const [vfx,ids] of Object.entries(groups))for(const id of ids)feedback[id]=cue(vfx);
for(const id of ['fireflies','spirit','star','pollen','rainbow'])feedback[id]=cue('magic','spirit_touch');
feedback.butterflies=cue('glint');
feedback.seeds=cue('glint','eco_gain','farm_seeds_drop');
feedback.grain=cue('glint',null,'farm_sack_handle');
feedback.weeds=cue('dust',null,'farm_plant_pull');
feedback.flower=cue('glint',null,'farm_harvest_pick');
feedback.rareseed=cue('glint',null,'farm_seeds_drop');
feedback.fallingdebris=cue('dust',null,'wall_debris_small');
export const MICROEVENT_FEEDBACK=Object.freeze(feedback);
export const FEEDBACK_SPRITES=Object.freeze({
 glint:{x:448,y:0,size:12},magic:{x:448,y:0,size:16,glow:true},
 feather:{x:0,y:256,size:15},dust:{x:320,y:320,size:23},
 mist:{x:0,y:192,size:25},splash:{x:128,y:128,size:13}
});
