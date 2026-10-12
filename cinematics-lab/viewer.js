(()=>{'use strict';
const data=JSON.parse(document.getElementById('inline-data').textContent);
const acts=data.manifest.acts,flat=acts.flatMap(a=>a.scenes);
const el=id=>document.getElementById(id),art=el('art'),stage=el('stage'),voice=new Audio();
voice.preload='none';
let index=0,language='ES',playing=true,elapsed=0,last=0,minimum=10,parallax=true,preloaded=[],generation=0,visibleGeneration=0,activeStack=el('layers'),retiringStack=null;
const rm=matchMedia('(prefers-reduced-motion: reduce)');
if(rm.matches){parallax=false;el('parallax').checked=false}
function scene(){return flat[index]}
function limit(){return Math.max(minimum,scene().audio[language].durationSeconds+0.8)}
function imageFor(s){return data.images[s.id]||''}
function setStatus(es,en){el('audioStatus').textContent=language==='ES'?es:en}
function releaseVoice(){voice.pause();voice.removeAttribute('src');voice.load()}
function setPlaying(value){playing=value;stage.classList.toggle('playing',playing);el('toggle').textContent=playing?(language==='ES'?'Pausa':'Pause'):(language==='ES'?'Reproducir':'Play');el('toggle').setAttribute('aria-label',el('toggle').textContent)}
function startVoice(token){
  const attempt=voice.play();
  if(attempt&&typeof attempt.then==='function')attempt.then(()=>{if(token===generation)setStatus('Voz en reproducción · Opus mono','Narration playing · mono Opus')});
  if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>{
    if(token!==generation)return;
    elapsed=0;last=0;setPlaying(false);
    setStatus('Pulsa Reproducir para activar la voz.','Press Play to start narration.');updateTime();
  });
}
function preloadNext(){
  preloaded=[];
  if(navigator.deviceMemory&&navigator.deviceMemory<=4)return;
  const next=flat[index+1];if(!next)return;
  const paths=next.layers.length?next.layers.map(layer=>data.images[layer.image]):[imageFor(next)];
  for(const src of paths){const img=new Image();img.src=src;preloaded.push(img)}
}
function render(){
  const token=++generation,s=scene(),a=acts[s.act-1];
  if(retiringStack){retiringStack.remove();retiringStack=null}
  last=0;releaseVoice();art.classList.remove('visible');art.alt=s.artDirection;
  if(s.layers.length){
    art.removeAttribute('src');
    const nodes=s.layers.map(layer=>{
      const img=new Image();img.alt='';img.src=data.images[layer.image];
      const motion=layer.motion;
      if(!motion)throw new Error('Missing motion for '+s.id+' '+layer.image);
      img.style.setProperty('--layer-start-x',`${motion.startXPercent}%`);
      img.style.setProperty('--layer-end-x',`${motion.endXPercent}%`);
      img.style.setProperty('--layer-start-y','0%');
      img.style.setProperty('--layer-end-y','0%');
      img.style.setProperty('--layer-start-scale',motion.startScale);
      img.style.setProperty('--layer-end-scale',motion.endScale);
      return img;
    });
    const nextStack=document.createElement('div');nextStack.className='layers';nextStack.replaceChildren(...nodes);
    Promise.all(nodes.map(img=>img.decode?img.decode().catch(()=>{}):Promise.resolve())).then(()=>{
      if(token!==generation)return;
      const oldStack=activeStack;
      stage.appendChild(nextStack);
      requestAnimationFrame(()=>{
        if(token!==generation){nextStack.remove();return}
        nextStack.classList.add('ready');oldStack.classList.remove('ready');activeStack=nextStack;retiringStack=oldStack;visibleGeneration=token;last=0;
        setTimeout(()=>{oldStack.remove();if(retiringStack===oldStack)retiringStack=null},500);
        setTimeout(()=>{if(token===generation&&playing)startVoice(token)},120);
      });
    });
  }else{
    const src=imageFor(s);if(!src)throw new Error('Missing art for '+s.id);
    art.onload=()=>art.classList.add('visible');art.src=src;
  }
  stage.classList.toggle('layered',s.layers.length>0);
  el('sceneLabel').textContent=language==='ES'?`Acto ${a.roman} · Escena ${s.scene} · Noche ${a.afterNight}`:`Act ${a.roman} · Scene ${s.scene} · Night ${a.afterNight}`;
  el('caption').textContent=language==='ES'?s.narrationRaw:s.narrationRawEN;
  el('actTitle').textContent=language==='ES'?a.title:a.titleEN;
  el('actNote').textContent=language==='ES'?a.closingRaw:a.closingRawEN;
  el('position').textContent=`${String(index+1).padStart(2,'0')} / ${String(flat.length).padStart(2,'0')}`;
  el('acts').replaceChildren(...acts.map(x=>{const b=document.createElement('button');b.textContent=x.roman;b.title=language==='ES'?x.title:x.titleEN;b.setAttribute('aria-current',String(x.number===s.act));b.onclick=()=>jump((x.number-1)*5);return b}));
  el('scenes').replaceChildren(...a.scenes.map(x=>{const b=document.createElement('button');b.textContent=x.scene;b.setAttribute('aria-label',(language==='ES'?'Escena ':'Scene ')+x.scene);b.setAttribute('aria-current',String(x.id===s.id));b.onclick=()=>jump((x.act-1)*5+x.scene-1);return b}));
  stage.style.setProperty('--pan-x',`${s.camera.panXPercent}%`);stage.style.setProperty('--pan-y',`${s.camera.panYPercent}%`);
  stage.classList.toggle('no-parallax',!parallax);setPlaying(playing);
  const source=data.audio[`${s.id}-${language}`];if(!source)throw new Error('Missing audio for '+s.id+' '+language);
  voice.src=source;voice.load();
  setStatus('Cargando ilustración y voz…','Loading illustration and narration…');
  updateTime();preloadNext();
}
function updateTime(){const end=limit();el('progress').style.width=`${Math.min(100,elapsed/end*100)}%`;el('timer').textContent=`${Math.floor(elapsed)} / ${end.toFixed(1)} s`;el('durationValue').textContent=`${end.toFixed(1)} s`}
function jump(n){index=Math.min(flat.length-1,Math.max(0,n));elapsed=0;render()}
function frame(t){
  if(last&&playing&&visibleGeneration===generation){
    elapsed=Math.max(elapsed+(t-last)/1000,voice.currentTime||0);
    if(elapsed>=limit()){
      if(voice.ended){
        if(index<flat.length-1){index++;elapsed=0;render()}
        else{elapsed=limit();setPlaying(false);setStatus('Fin de la historia.','End of the story.')}
      }else elapsed=limit();
    }
    updateTime();
  }
  last=t;requestAnimationFrame(frame);
}
el('prev').onclick=()=>jump(index-1);el('next').onclick=()=>jump(index+1);el('restart').onclick=()=>jump(index);
el('toggle').onclick=()=>{
  if(playing){voice.pause();setPlaying(false)}
  else{if(voice.ended){elapsed=0;voice.currentTime=0}setPlaying(true);last=0;if(visibleGeneration===generation)startVoice(generation)}
};
el('duration').oninput=e=>{minimum=Number(e.target.value);elapsed=Math.min(elapsed,limit());updateTime()};
el('language').onchange=e=>{language=e.target.value;document.documentElement.lang=language.toLowerCase();jump(index)};
el('parallax').onchange=e=>{parallax=e.target.checked;stage.classList.toggle('no-parallax',!parallax)};
el('texts').onchange=e=>stage.classList.toggle('captions-off',!e.target.checked);
document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;if(e.key===' '){e.preventDefault();el('toggle').click()}else if(e.key==='ArrowRight')jump(index+1);else if(e.key==='ArrowLeft')jump(index-1)});
document.addEventListener('visibilitychange',()=>{last=0});
render();requestAnimationFrame(frame);
})();
