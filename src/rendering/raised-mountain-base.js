// Reviewed decorative skyline placement; never changes terrain or atlas silhouettes.
export function withRaisedMountainBase(profile,biome,search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);
 if(!profile||!['savanna','grand_river'].includes(biome)||q.get('visualLab')!=='global-lighting'||q.get('mountainBase')!=='raised')return profile;
 return {...profile,arcLayout:profile.arcLayout.map(arc=>({...arc,baseY:arc.baseY+25}))};
}
