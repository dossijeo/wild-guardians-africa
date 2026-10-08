export class ViewMap extends Map{
 constructor(limit){super();this.limit=limit;}
 set(key,value){if(!this.has(key)&&this.size>=this.limit)this.delete(this.keys().next().value);return super.set(key,value);}
}
export class ViewSet extends Set{
 constructor(limit){super();this.limit=limit;}
 add(key){if(!this.has(key)&&this.size>=this.limit)this.delete(this.values().next().value);return super.add(key);}
}
export function trimViewRegions(view){
 while(view.searchedRegions.length&&(view.searchedRegions.length>4||view.searchedRegions.reduce((n,r)=>n+r.nodes.size,0)>4096))view.searchedRegions.shift();
 const regions=new Set(view.closedRegions.values());let retained=0;for(const region of regions)retained+=region.size;
 if(retained>4096)view.closedRegions.clear();
}
