// A single interactive game surface; mandatory hiring resolves only through confirmation.
export class GameSurfaces {
  constructor(){this.reset();}
  reset(){this.active=null;this.mandatory=false;this.deferred=new Set();}
  open(kind,{mandatory=false,force=false}={}){
    if(this.mandatory&&this.active!==kind&&!force)return false;
    if(this.active&&this.active!==kind&&!this.mandatory)this.deferred.add(this.active);
    const keepMandatory=this.mandatory&&this.active===kind;
    this.active=kind;this.mandatory=mandatory||keepMandatory;this.deferred.delete(kind);return true;
  }
  close({resolved=false}={}){
    if(this.mandatory&&!resolved)return null;
    const kind=this.active;if(kind&&!this.mandatory)this.deferred.add(kind);
    this.active=null;this.mandatory=false;return kind;
  }
  shouldOpen(kind){return !this.active&&!this.deferred.has(kind);}
}
