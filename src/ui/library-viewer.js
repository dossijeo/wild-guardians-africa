import {assetUrl} from '../rendering/asset-url.js';

export const LIBRARY_LABS=Object.freeze({crops:'Cultivos',walls:'Bastión',destruction:'Destrucción',sfx:'Sonidos'});

// A dedicated game screen replaces the library catalogue. The original lab
// owns its full content viewport and keeps its controls, canvas and downloads.
export class LibraryViewer {
  constructor(container,key,{onBack=()=>{},onMenu=()=>{}}={}){
    if(!Object.hasOwn(LIBRARY_LABS,key))throw new Error('Laboratorio desconocido');
    this.container=container;
    const root=document.createElement('main');root.className='library-viewer';
    const header=document.createElement('header');header.className='library-viewer-header';
    const back=document.createElement('button');back.type='button';back.className='secondary';back.textContent='← Biblioteca';back.onclick=onBack;
    const title=document.createElement('div');title.className='library-viewer-title';
    const brand=document.createElement('small');brand.textContent='Wild Guardians / Africa';
    const heading=document.createElement('h1');heading.textContent=LIBRARY_LABS[key];title.append(brand,heading);
    const language=document.createElement('select');language.dataset.languageSelect='';language.setAttribute('aria-label','Idioma');
    for(const [value,text] of [['en','English'],['es','Español']])language.add(new Option(text,value));
    language.value=window.WildGuardiansLanguage?.getLanguage()??'en';
    const menu=document.createElement('button');menu.type='button';menu.className='ghost';menu.textContent='Menú principal';menu.onclick=onMenu;
    header.append(back,title,language,menu);
    const iframe=document.createElement('iframe');iframe.className='library-viewer-frame';iframe.title='Laboratorio '+LIBRARY_LABS[key];iframe.src=assetUrl(`/library.html?lab=${key}`);
    root.append(header,iframe);container.replaceChildren(root);this.root=root;this.iframe=iframe;back.focus({preventScroll:true});
  }
  dispose(){this.iframe.src='about:blank';this.root.remove();}
}
