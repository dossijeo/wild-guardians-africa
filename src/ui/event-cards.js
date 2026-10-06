import {RAID_NOTICE_TEXT} from '../simulation/raid-notice.js';

export function eventCardSpec(message){
  const text=message.text;
  if(text===RAID_NOTICE_TEXT)return {icon:2,title:'Incursión',urgent:true};
  if(text.startsWith('La reparación'))return {icon:8,title:'Reparación cancelada',urgent:true};
  if(/^(Cayó|El sol vuelve|Faltan recursos)/.test(text))return {icon:5,title:'El poblado necesita ayuda',urgent:true};
  for(const title of ['Estrés nocturno','Plaga','Noche favorable','Suelo fértil','Buena temporada'])if(text.startsWith(title))return {icon:title==='Suelo fértil'?1:0,title,urgent:['Estrés nocturno','Plaga'].includes(title)};
  return {icon:11,title:'Aviso del poblado',urgent:false};
}

// Preserve each live DOM node, focus and click target while the lifetime changes.
export class EventCards {
  constructor(container,assets){this.container=container;this.assets=assets;this.cards=new Map();}
  render(messages,lifetime,now){
    const live=new Set(messages.map(m=>m.id));
    for(const [id,card] of this.cards)if(!live.has(id)){card.remove();this.cards.delete(id);}
    for(const message of messages){
      let card=this.cards.get(message.id);
      if(!card){
        const spec=eventCardSpec(message);card=document.createElement('div');card.className='notice-card'+(spec.urgent?' urgent':'');
        const visit=document.createElement('button');visit.type='button';visit.dataset.notice=message.id;visit.className='notice-visit';
        const image=document.createElement('img');image.src=this.assets['event'+spec.icon].src;image.alt='';image.setAttribute('aria-hidden','true');
        const copy=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small');title.textContent=spec.title;detail.textContent=message.text;copy.append(title,detail);visit.append(image,copy);
        const close=document.createElement('button');close.type='button';close.dataset.dismissNotice=message.id;close.className='dismiss';close.setAttribute('aria-label','Cerrar');close.textContent='×';
        const life=document.createElement('i');life.className='life';life.setAttribute('aria-hidden','true');card.append(visit,close,life);this.container.append(card);this.cards.set(message.id,card);
      }
      card.querySelector('.life').style.transform=`scaleX(${lifetime.remaining(message.id,now)})`;
    }
  }
}
