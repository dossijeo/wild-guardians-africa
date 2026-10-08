// QA metrics describe differences; they are not an automatic visual approval.
export function noiseSpatialPoses(state){
  const terrain=Array.from({length:17},(_,i)=>{const x=-160+i*20;return {id:`terrain-${x}`,kind:'terrain',x,z:x*.4,offset:[8,13,18],aim:1};});
  const centre=state.structures.find(item=>item.kind==='center')??state.structures[0]??state.villages[0];
  return [...terrain,
    {id:'centre',kind:'building',x:centre.x,z:centre.z,offset:[15,12,22],aim:2},
    {id:'workers-beasts',kind:'actors',x:centre.x,z:centre.z+13,offset:[0,11,23],aim:1.3},
    {id:'crop-stages',kind:'crops',x:centre.x+30,z:centre.z+11,offset:[0,10,18],aim:1}];
}

export function compareNoisePixels(a,b,width,height,tileSize=16){
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||!Number.isSafeInteger(tileSize)||tileSize<1||a.length!==width*height*4||b.length!==a.length)throw Error('Invalid RGBA comparison dimensions');
  const columns=Math.ceil(width/tileSize),rows=Math.ceil(height/tileSize),tiles=new Uint32Array(columns*rows);
  let differentPixels=0,alphaDifferences=0,totalError=0,maxError=0;
  const bounds=[width,height,-1,-1];
  for(let i=0;i<a.length;i+=4){
    const index=i/4,x=index%width,y=Math.floor(index/width);let error=0;
    for(let c=0;c<3;c++){const delta=Math.abs(a[i+c]-b[i+c]);error+=delta;maxError=Math.max(maxError,delta);}
    if(error){differentPixels++;bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);}
    if(a[i+3]!==b[i+3])alphaDifferences++;
    totalError+=error;tiles[Math.floor(y/tileSize)*columns+Math.floor(x/tileSize)]+=error;
  }
  let maxTileMae=0,maxTile=null;
  for(let i=0;i<tiles.length;i++){
    const x=(i%columns)*tileSize,y=Math.floor(i/columns)*tileSize;
    const count=Math.min(tileSize,width-x)*Math.min(tileSize,height-y);
    const mae=tiles[i]/(count*3*255);
    if(mae>maxTileMae){maxTileMae=mae;maxTile=[x,y,Math.min(tileSize,width-x),Math.min(tileSize,height-y)];}
  }
  return {pixels:width*height,differentPixels,fraction:differentPixels/(width*height),rgbMae:totalError/(width*height*3*255),maxError,alphaDifferences,bounds:differentPixels?bounds:null,tileSize,maxTileMae,maxTile};
}
