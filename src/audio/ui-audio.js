export const UI_SOUND_ROUTES=Object.freeze({ui_panel_open:'ui-surface-transition',ui_panel_close:'ui-surface-transition',ui_tab:'ui-surface-transition',ui_error:'ui-command-error',ui_pause:'ui-user-pause-transition',ui_resume:'ui-user-pause-transition',spirit_select:'ui-magic-selection'});
export const UI_SOUND_IDS=Object.freeze(['ui_panel_open','ui_panel_close','ui_tab','ui_error','ui_pause','ui_resume','spirit_select']);

// Feed actual interface transitions, never polling/renders or logical payments.
export class UiAudio {
  constructor(play,clock=()=>performance.now()/1000){this.play=play;this.clock=clock;this.generation=0;this.reset();}
  cue(id,emitter,current=()=>true){const generation=this.generation,requested=this.clock(),isCurrent=()=>generation===this.generation&&this.clock()-requested<=.5&&current();try{Promise.resolve(this.play(id,{bus:'ui',emitter,isCurrent})).catch(()=>{});}catch{} }
  surface(kind,key=kind){
    const identity=kind+':'+key;if(identity===this.identity)return;
    const tab=this.kind===kind&&this.identity!==null;this.kind=kind;this.identity=identity;const revision=++this.surfaceRevision;this.cue(tab?'ui_tab':'ui_panel_open','ui:surface',()=>revision===this.surfaceRevision);
  }
  close({silent=false}={}){const active=this.identity!==null;this.kind=null;this.identity=null;const revision=++this.surfaceRevision;if(active&&!silent)this.cue('ui_panel_close','ui:surface',()=>revision===this.surfaceRevision);}
  selectSpell(spell){if(!['shield','multiply','growth'].includes(spell))return false;const revision=++this.spellRevision,surfaceRevision=this.surfaceRevision;this.cue('spirit_select','ui:magic',()=>revision===this.spellRevision&&surfaceRevision===this.surfaceRevision);return true;}
  error({force=false}={}){const now=this.clock();if(!force&&now-this.lastErrorAt<1)return;this.lastErrorAt=now;this.cue('ui_error','ui:error');}
  pause(before,after){const id=!before.includes('menu')&&after.includes('menu')?'ui_pause':before.includes('menu')&&!after.length?'ui_resume':null;if(id){const revision=++this.pauseRevision;this.cue(id,'ui:pause',()=>revision===this.pauseRevision);}}
  reset(){this.generation++;this.surfaceRevision=0;this.pauseRevision=0;this.spellRevision=0;this.identity=null;this.kind=null;this.lastErrorAt=-Infinity;}
}
