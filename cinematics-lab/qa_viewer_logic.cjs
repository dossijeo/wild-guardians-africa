// Non-browser interaction check. It does not claim visual or file:// acceptance.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

class Element{
  constructor(){this.children=[];this.attributes={};this.style={values:{},setProperty(name,value){this.values[name]=value}};const classes=new Set();this.classList={add:name=>classes.add(name),remove:name=>classes.delete(name),toggle:(name,on)=>on===undefined?(classes.has(name)?(classes.delete(name),false):(classes.add(name),true)):(on?(classes.add(name),true):(classes.delete(name),false)),contains:name=>classes.has(name)};this.textContent='';this.checked=true}
  replaceChildren(...children){this.children=children}
  appendChild(child){this.children.push(child)}
  remove(){}
  removeAttribute(name){delete this.attributes[name];if(name==='src')this.src=''}
  setAttribute(name,value){this.attributes[name]=value}
  querySelectorAll(){return this.children}
}
class FakeImage extends Element{constructor(){super();FakeImage.all.push(this)}decode(){return Promise.resolve()}}
FakeImage.all=[];
class FakeAudio{
  constructor(){this.src='';this.currentTime=0;this.ended=false;this.playCount=0;this.pauseCount=0;FakeAudio.last=this}
  play(){this.playCount++;return Promise.resolve()}
  pause(){this.pauseCount++}
  removeAttribute(name){if(name==='src')this.src=''}
  load(){}
}
const elements=new Map();
const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)};
const makeScene=(id,number)=>({id,act:1,scene:number,audio:{ES:{durationSeconds:12},EN:{durationSeconds:8.5}},camera:{panXPercent:0.5,panYPercent:0.2,zoom:1.04},layers:[{image:`layers/${id}-background.webp`,depth:0,motion:{startXPercent:-0.78125,endXPercent:0.78125,startYPercent:-0.3125,endYPercent:0.3125,startScale:1.08,endScale:1.12}},{image:`layers/${id}-foreground.webp`,depth:0.9,motion:{startXPercent:-2.328125,endXPercent:2.328125,startYPercent:-0.93125,endYPercent:0.93125,startScale:1.08,endScale:1.1326}}],narrationRaw:`${number}.  Texto ES`,narrationRawEN:`${number}.  Exact EN`,artDirection:'woodcut'});
const payload={manifest:{acts:[{number:1,roman:'I',title:'Título',titleEN:'Title',afterNight:10,closingRaw:'CIERRE',closingRawEN:'CLOSURE',scenes:[makeScene('01',1),makeScene('02',2)]}]},images:{'layers/01-background.webp':'img1b','layers/01-foreground.webp':'img1f','layers/02-background.webp':'img2b','layers/02-foreground.webp':'img2f'},audio:{'01-ES':'voice1es','01-EN':'voice1en','02-ES':'voice2es','02-EN':'voice2en'}};
get('inline-data').textContent=JSON.stringify(payload);
const raf=[];const timers=[];
const context={document:{getElementById:get,createElement:()=>new Element(),addEventListener(){} ,documentElement:{lang:'es'}},Image:FakeImage,Audio:FakeAudio,matchMedia:()=>({matches:false}),navigator:{deviceMemory:2},requestAnimationFrame:cb=>raf.push(cb),setTimeout:cb=>timers.push(cb),Promise,console};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'viewer.js'),'utf8'),context);
async function tick(time){
  await Promise.resolve();await Promise.resolve();
  const callbacks=raf.splice(0);for(const callback of callbacks)callback(time);
  const delayed=timers.splice(0);for(const callback of delayed)callback();
  await Promise.resolve();await Promise.resolve();
}
(async()=>{
  const voice=FakeAudio.last;
  const [background,foreground]=FakeImage.all;
  const delta=img=>Math.abs(parseFloat(img.style.values['--layer-end-x'])-parseFloat(img.style.values['--layer-start-x']));
  assert.ok(delta(background)>1,'background has measurable movement');
  assert.ok(delta(foreground)>delta(background)*2,'foreground moves at a different speed');
  assert.ok(parseFloat(background.style.values['--layer-end-scale'])>parseFloat(background.style.values['--layer-start-scale']),'camera.zoom reaches background');
  assert.ok(parseFloat(foreground.style.values['--layer-end-scale'])>parseFloat(foreground.style.values['--layer-start-scale']),'camera.zoom reaches foreground');
  const css=fs.readFileSync(require('node:path').join(__dirname,'viewer.template.html'),'utf8');
  assert.match(css,/animation:layer-drift var\(--duration\) linear both/,'one slow track lasts for the entire scene');
  assert.doesNotMatch(css,/animation:layer-drift[^;]*infinite/,'the scene motion does not loop');
  assert.equal(background.style.values['--duration'],'12.8s','scene voice plus margin sets movement duration');
  assert.match(css,/\.stage\.playing \.layers img\{animation-play-state:running\}/);
  assert.match(css,/\.stage\.no-parallax \.layers img\{animation:none;transform:none\}/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.stage \.layers img\{animation:none!important;transform:none!important\}\}/);
  assert.ok(get('stage').classList.contains('playing'),'animation is enabled while playing');
  assert.equal(voice.src,'voice1es');assert.equal(voice.playCount,0,'voice waits for decoded illustration');
  await tick(1000);await tick(1050);assert.equal(voice.playCount,1);
  get('next').onclick();get('prev').onclick();
  assert.equal(voice.src,'voice1es');
  const before=voice.playCount;await tick(1100);await tick(1150);assert.equal(voice.playCount,before+1,'stale navigation does not play');
  get('language').onchange({target:{value:'EN'}});await tick(1200);await tick(1250);
  assert.equal(voice.src,'voice1en');assert.equal(get('caption').textContent,'1.  Exact EN');
  const pauses=voice.pauseCount;get('toggle').onclick();assert.equal(voice.pauseCount,pauses+1);assert.ok(!get('stage').classList.contains('playing'),'pause freezes motion');
  const plays=voice.playCount;get('toggle').onclick();assert.equal(voice.playCount,plays+1);assert.ok(get('stage').classList.contains('playing'),'resume restarts motion');
  get('parallax').onchange({target:{checked:false}});assert.ok(get('stage').classList.contains('no-parallax'),'user switch disables motion');
  get('parallax').onchange({target:{checked:true}});assert.ok(!get('stage').classList.contains('no-parallax'),'user switch restores motion');
  get('duration').oninput({target:{value:'20'}});
  assert.ok(FakeImage.all.some(img=>img.style.values['--duration']==='20s'),'manual scene duration also changes motion timing');
  await tick(2000);await tick(20000);
  assert.equal(voice.src,'voice1en','scene does not advance before narration ends');
  voice.ended=true;await tick(22000);
  assert.equal(voice.src,'voice2en','completed narration permits advance');
  console.log('PASS: decoded crossfade gate, rapid navigation cancellation, ES/EN switch, pause/resume and no voice cutoff');
})().catch(error=>{console.error(error);process.exitCode=1});
