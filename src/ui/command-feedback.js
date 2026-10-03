function setText(node,text){
  // Preserve language-bridge translations between UI updates.
  if(node.dataset.sourceText!==text){node.dataset.sourceText=text;node.textContent=text;}
}

// Use the original HUD's placement banner or the active panel, never the
// Spirit's reserved strip. This reports a rejected command without executing it.
export function renderCommandFeedback(document,{label='',message='',onCancel,onDismiss}){
  const banner=document.querySelector('#placementBanner');if(!banner)return;
  const modal=document.querySelector('#modal [role="dialog"]');
  const panel=modal?.querySelector('.panel-body')??modal??document.querySelector('#panel .panel-body')??document.querySelector('#context .panel-body');
  for(const node of document.querySelectorAll('.command-feedback'))if(node.parentElement!==panel&&node.parentElement!==banner.querySelector('[data-placement-copy]'))node.remove();
  if(panel){
    let feedback=panel.querySelector(':scope > .command-feedback');
    if(message){if(!feedback){feedback=document.createElement('p');feedback.className='command-feedback';feedback.setAttribute('role','alert');panel.append(feedback);}setText(feedback,message);}
    else feedback?.remove();
  }
  const visible=!panel&&Boolean(label||message);banner.hidden=!visible;banner.style.display=visible?'flex':'none';
  if(!visible)return;
  let copy=banner.querySelector('[data-placement-copy]');
  if(!copy){
    copy=document.createElement('span');copy.dataset.placementCopy='';banner.append(copy);
    const button=document.createElement('button');button.type='button';button.dataset.placementCancel='';banner.append(button);
  }
  let title=copy.querySelector('b');
  if(label){if(!title){title=document.createElement('b');copy.prepend(title);}setText(title,label);}
  else title?.remove();
  let feedback=copy.querySelector('.command-feedback');
  if(message){if(!feedback){feedback=document.createElement('span');feedback.className='command-feedback';feedback.setAttribute('role','alert');copy.append(feedback);}setText(feedback,message);}
  else feedback?.remove();
  const button=banner.querySelector('[data-placement-cancel]');setText(button,label?'Cancelar':'Cerrar');button.onclick=label?onCancel:onDismiss;
}
