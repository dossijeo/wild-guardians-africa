import {createVisualEventFence} from './prototype_visual_event_fence.mjs';

// Diagnostic fail-closed presentation barrier. Hiding a canvas is deliberately
// conservative: it is not a safe-horizon certificate or a production UX.
export function createVisibleEventFence(session,{classify,setVisible,capacity=128}={}){
 if(typeof setVisible!=='function')throw TypeError('Expected visibility callback');
 const fence=createVisualEventFence(session,{classify,capacity});let fault=false,busy=false,visible=true;
 const hide=()=>{if(visible){visible=false;setVisible(false);}};
 return {
  receive(batch){
   if(busy)throw Error('Reentrant presentation');
   if(fault)return {accepted:false,reason:'fault',hide:true};
   try{const result=fence.receive(batch);if(result.hide)hide();return result;}catch(error){fault=true;hide();throw error;}
  },
  present(sequence,apply,draw){
   if(busy)throw Error('Reentrant presentation');
   if(fault)return {accepted:false,reason:'fault',hide:true};
   if(typeof apply!=='function'||typeof draw!=='function')throw TypeError('Expected synchronous callbacks');
   busy=true;
   try{
    const result=fence.present(sequence,events=>{
     const applied=apply(events);if(applied!=null&&typeof applied.then==='function'){Promise.resolve(applied).catch(()=>{});throw TypeError('Async presentation is unsupported');}
     const rendered=draw();if(rendered!=null&&typeof rendered.then==='function'){Promise.resolve(rendered).catch(()=>{});throw TypeError('Async drawing is unsupported');}
    });
    if(result.hide)hide();else if(result.accepted&&!visible){setVisible(true);visible=true;}
    return result;
   }catch(error){fault=true;hide();throw error;}finally{busy=false;}
  },
  state(){return {...fence.state(),visible,fault:fault||fence.state().fault};}
 };
}
