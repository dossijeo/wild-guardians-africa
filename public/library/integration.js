export function integrateLibraryLab(document,key){
  document.documentElement.dataset.libraryLab=key;
  const responsive=document.createElement('link');responsive.rel='stylesheet';responsive.href='library/mobile.css';document.head.append(responsive);
  if(['crops','destruction'].includes(key)){
    const toggle=document.createElement('button');toggle.type='button';toggle.className='lab-controls-toggle';toggle.dataset.noI18n='';
    const panel=document.querySelector(key==='crops'?'.sidebar':'aside');
    const update=()=>{const open=!document.documentElement.classList.contains('lab-controls-hidden');toggle.textContent=(document.documentElement.lang.startsWith('es')?'Controles':'Controls')+(open?' ▾':' ▸');toggle.setAttribute('aria-expanded',String(open));};
    toggle.onclick=()=>{document.documentElement.classList.toggle('lab-controls-hidden');update();};
    if(panel){panel.id||='lab-controls';toggle.setAttribute('aria-controls',panel.id);document.body.append(toggle);update();new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});}
  }
  const fonts=document.createElement('link');fonts.rel='stylesheet';fonts.href='content/fonts.css';document.head.append(fonts);
  const style=document.createElement('style');style.textContent=`
    html[data-library-lab] body{font-family:Banga,system-ui,sans-serif}
    html[data-library-lab] button,html[data-library-lab] input,html[data-library-lab] select{font-family:inherit}
    html[data-library-lab] .brand-name,html[data-library-lab] .brand strong,html[data-library-lab] header .brand{font-family:'Ga Maamli',serif}
    html[data-library-lab] body{padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}
  `;document.head.append(style);
  const cropBrand=key==='crops'&&document.querySelector('.brand strong');if(cropBrand)cropBrand.textContent='Wild Guardians';
  const wallBrand=key==='walls'&&document.querySelector('.brand-name');if(wallBrand)wallBrand.textContent='Wild Guardians';
  if(key==='walls'){const note=document.querySelector('.brand-note');if(note)note.textContent='Biblioteca';}
  if(key==='destruction'){
    const brand=document.querySelector('header .eyebrow');if(brand)brand.textContent='Wild Guardians / Africa';
    const badge=document.querySelector('header .badge');if(badge)for(const child of badge.childNodes)if(child.nodeType===3)child.textContent='Biblioteca';
  }
  document.title='Wild Guardians · '+({crops:'Cultivos',walls:'Bastión',destruction:'Destrucción',sfx:'Sonidos'}[key]??'Biblioteca');
}
