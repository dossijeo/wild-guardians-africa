// Stable minimum frontier: equal scores keep insertion order, matching the
// previous stable sort while avoiding sorting the whole A* frontier per node.
export class SearchFrontier {
  constructor(){this.items=[];this.sequence=0;}
  get length(){return this.items.length;}
  values(){return this.items.map(entry=>entry.value);}
  before(a,b){return a.value.f<b.value.f||a.value.f===b.value.f&&a.order<b.order;}
  push(value){
    const entry={value,order:this.sequence++},items=this.items;let i=items.length;items.push(entry);
    while(i){const parent=(i-1)>>1;if(!this.before(entry,items[parent]))break;items[i]=items[parent];i=parent;}
    items[i]=entry;
  }
  pop(){
    const items=this.items,first=items[0],last=items.pop();if(!items.length)return first?.value;
    let i=0;
    while(i*2+1<items.length){
      let child=i*2+1;if(child+1<items.length&&this.before(items[child+1],items[child]))child++;
      if(!this.before(items[child],last))break;items[i]=items[child];i=child;
    }
    items[i]=last;return first.value;
  }
}
