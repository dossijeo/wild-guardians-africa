export function loadingFailureDetail(message,locale='en-US'){
 const value=String(message);return locale.startsWith('es')?value:value.replace(/^No se pudo cargar(?=\s)/,'Could not load');
}

export function clearLoadingFailure(doc=document){doc.querySelector('.loading-failure')?.remove();}

// A failed load needs an explanation after the menu returns; ordinary error toasts
// retain their existing lifetime. This notice owns no timer or rendering resources.
export function showLoadingFailure(message,{document:doc=document,locale='en-US'}={}){
 clearLoadingFailure(doc);
 const es=locale.startsWith('es'),element=doc.createElement('div');element.className='error-banner loading-failure';element.setAttribute('role','alert');
 const title=doc.createElement('strong');title.textContent=es?'No se ha podido preparar tu mundo.':'Your world could not be prepared.';
 const detail=doc.createElement('span');detail.textContent=loadingFailureDetail(message,locale);
 const dismiss=doc.createElement('button');dismiss.type='button';dismiss.textContent=es?'Cerrar':'Dismiss';dismiss.onclick=()=>{dismiss.onclick=null;element.remove();};
 element.append(title,detail,dismiss);doc.body.append(element);return element;
}
