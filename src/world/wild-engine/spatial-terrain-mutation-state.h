SpatialStaticTicket terrainMutationBefore(IntentState& s,const SpatialStaticMutation* bounds,int count,
    SpatialTerrainProbe probe,void* context,int recipes,bool known){
  SpatialStaticTicket ticket;if(!s.bodyDomainActive&&s.reservedBodies.empty())return ticket;
  ticket.executing=true;ticket.before=executionWorldStamp();ticket.tracked=s.executionWorldStamp==ticket.before;
  s.terrainRecipeChunks+=uint64_t(recipes);
  if(!known){ticket.allowed=false;s.terrainRejected++;return ticket;}
  struct Query {IntentState& s;SpatialTerrainProbe probe;void* context;const SpatialStaticMutation* box=nullptr;bool blocked=false;};
  Query query{s,probe,context};
  for(int i=0;i<count&&!query.blocked;i++){
    const auto& box=bounds[i];
    query.box=&box;
    spatialVisitBodiesBox(box.minX-5,box.minZ-5,box.maxX+5,box.maxZ+5,
      [](uint64_t,const SpatialBodyView& body,void* opaque){auto& q=*static_cast<Query*>(opaque);
        if(q.blocked||!(body.flags&1))return;
        if(body.x<q.box->minX-body.r-5||body.x>q.box->maxX+body.r+5||
           body.z<q.box->minZ-body.r-5||body.z>q.box->maxZ+body.r+5)return;
        q.s.terrainBodyChecks++;
        if(!q.probe(body.x,body.z,body.x,body.z,body.r,body.kind,q.context))q.blocked=true;
      },&query);
  }
  if(query.blocked){ticket.allowed=false;s.terrainRejected++;return ticket;}
  std::set<uint64_t> candidates,affected;
  for(int i=0;i<count;i++){const auto& b=bounds[i];const auto ids=reservationBoxCandidates(s,b.minX,b.minZ,b.maxX,b.maxZ);
    candidates.insert(ids.begin(),ids.end());}
  for(uint64_t actor:candidates){
    const auto found=s.activeIntents.find(actor);if(found==s.activeIntents.end()||found->second.state!=PlanningState::RouteActive)continue;
    const auto& intent=found->second;const auto& route=s.routeSlots[intent.slot];if(!route.reserved)continue;
    if(!executionBindingCoherent(s,route.reservationBody,intent.slot)||intent.routeCursor>route.points.size()/2){
      ticket.allowed=false;s.terrainRejected++;return ticket;}
    s.terrainCandidates++;double x=route.hasExecution?route.executionPose[0]:route.originX,z=route.hasExecution?route.executionPose[1]:route.originZ;
    if(intent.routeCursor==route.points.size()/2){s.terrainSegments++;
      if(!probe(x,z,x,z,route.radius,intent.animal?1:0,context))affected.insert(actor);}
    for(size_t i=size_t(intent.routeCursor)*2;i<route.points.size();i+=2){
      const double nx=route.points[i],nz=route.points[i+1];s.terrainSegments++;
      if(!probe(x,z,nx,nz,route.radius,intent.animal?1:0,context)){affected.insert(actor);break;}
      x=nx;z=nz;
    }
  }
  retireMutationRoutes(s,affected,s.terrainRevocations);return ticket;
}
void terrainMutationCommitted(IntentState& s,const SpatialStaticTicket& ticket){
  if(!ticket.executing||!ticket.allowed)return;s.terrainCommits++;const auto after=executionWorldStamp();
  if(ticket.tracked&&s.executionEnabled&&s.executionWorldStamp==ticket.before&&
     after[0]==ticket.before[0]+1&&after[1]==ticket.before[1]&&after[2]==ticket.before[2])s.executionWorldStamp=after;
}
