import sharp from 'sharp';
const [reference,candidate]=process.argv.slice(2);if(!reference||!candidate)throw Error('Usage: node compare_grass_capture.mjs reference.png candidate.png');
const a=await sharp(reference).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(candidate).ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(a.info.width!==1280||a.info.height!==720||b.info.width!==a.info.width||b.info.height!==a.info.height)throw Error('Expected matching 1280x720 captures');
for(const [name,x0,y0,x1,y1] of [['full',0,0,1280,720],['grass-region',210,350,1050,590]]){
 let changed=0,max=0,total=0,sum=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*a.info.width+x)*4;let d=0;for(let c=0;c<3;c++)d=Math.max(d,Math.abs(a.data[i+c]-b.data[i+c]));if(d)changed++;max=Math.max(max,d);sum+=d;total++;}
 console.log(JSON.stringify({name,total,changed,max,meanMaxChannelDifference:sum/total}));
}
