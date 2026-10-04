export class ToolSession {
  constructor(duration=10){this.duration=duration;this.tool=null;this.lastUse=0;}
  select(tool,now){this.tool=tool;this.lastUse=null;return tool;}
  used(now){this.lastUse=now;}
  expired(now){return !!this.tool&&this.lastUse!==null&&now-this.lastUse>=this.duration;}
  clear(){this.tool=null;}
}
