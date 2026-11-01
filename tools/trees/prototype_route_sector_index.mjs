// Shadow experiment only. Sector IDs must be those of the existing native
// navigation graph. This index never certifies a route or drives movement.
export class RouteSectorIndex {
  constructor(sectorSize,{padding=2,maxSectors=4096}={}){
    if(!Number.isFinite(sectorSize)||sectorSize<=0||!Number.isFinite(padding)||padding<0||!Number.isInteger(maxSectors)||maxSectors<1)throw new TypeError('Invalid sector index configuration');
    this.size=sectorSize;this.padding=padding;this.limit=maxSectors;
    this.routes=new Map();this.sectors=new Map();this.unknown=new Set();
  }
  remove(id){
    const previous=this.routes.get(id);if(!previous)return false;
    for(const key of previous){const owners=this.sectors.get(key);owners.delete(id);if(!owners.size)this.sectors.delete(key);}
    this.unknown.delete(id);this.routes.delete(id);return true;
  }
  set(id,start,points,radius,{verified=true}={}){
    this.remove(id);
    const keys=new Set(),valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
    let uncertain=!verified||!valid(start)||!Array.isArray(points)||!Number.isFinite(radius)||radius<0||!points.length;
    let from=start;
    if(!uncertain)for(const to of points){
      if(!valid(to)){uncertain=true;break;}
      const reach=this.padding+radius,minX=Math.floor((Math.min(from.x,to.x)-reach)/this.size),maxX=Math.floor((Math.max(from.x,to.x)+reach)/this.size),minZ=Math.floor((Math.min(from.z,to.z)-reach)/this.size),maxZ=Math.floor((Math.max(from.z,to.z)+reach)/this.size);
      const count=(maxX-minX+1)*(maxZ-minZ+1);
      if(!Number.isSafeInteger(count)||count>this.limit||keys.size+count>this.limit){uncertain=true;break;}
      for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++)keys.add(`${x},${z}`);
      from=to;
    }
    // Unknown routes always join every event; no partial registration is used.
    if(uncertain){keys.clear();this.unknown.add(id);}
    this.routes.set(id,keys);
    for(const key of keys){let owners=this.sectors.get(key);if(!owners)this.sectors.set(key,owners=new Set());owners.add(id);}
  }
  affected(changes){
    if(!changes?.complete||!Array.isArray(changes.sectors))return new Set(this.routes.keys());
    const affected=new Set(this.unknown);
    for(const sector of changes.sectors){
      if(!Number.isSafeInteger(sector?.x)||!Number.isSafeInteger(sector?.z))return new Set(this.routes.keys());
      for(const id of this.sectors.get(`${sector.x},${sector.z}`)??[])affected.add(id);
    }
    return affected;
  }
}
