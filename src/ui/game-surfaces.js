// A single interactive game surface, with deferred mandatory dialogs.
export class GameSurfaces {
  constructor(){this.reset();}
  reset(){this.active=null;this.deferred=new Set();}
  open(kind){if(this.active&&this.active!==kind)this.deferred.add(this.active);this.active=kind;this.deferred.delete(kind);}
  close(){const kind=this.active;if(kind)this.deferred.add(kind);this.active=null;return kind;}
  shouldOpen(kind){return !this.active&&!this.deferred.has(kind);}
}
