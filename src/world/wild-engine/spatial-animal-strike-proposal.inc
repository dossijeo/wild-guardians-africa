// A prepared strike can borrow only the terminal pose of its own acquired
// crop route. The body remains in the original reservation until Game finishes
// this attack. Preparation reads the source and never consumes RNG or a hit.
static const RouteSlot* animalStrikeRoute(const IntentState& s,uint64_t actor,uint64_t assignment){
 const auto found=s.activeIntents.find(actor);
 if(found==s.activeIntents.end())return nullptr;
 const auto& intent=found->second;
 if(!intent.animal||!intent.lease||intent.state!=PlanningState::RouteActive||intent.slot>=s.routeSlots.size())return nullptr;
 const auto& route=s.routeSlots[intent.slot];const auto& binding=route.animalRouteBinding;
 if(!binding||binding->assignmentSequence!=assignment||!executionBindingCoherent(s,route.reservationBody,intent.slot)||
    !route.hasExecution||route.executionPose[6]!=1||!s.executionEnabled||binding->source->target!=intent.target)return nullptr;
 if(!animalRouteDestinationCurrent(s,intent,*binding->source))return nullptr;
 SpatialBodyView body;
 if(!spatialReadBody(route.reservationBody,body)||body.kind!=1||body.flags!=1||body.x!=route.executionPose[0]||
    body.z!=route.executionPose[1]||body.r!=route.radius)return nullptr;
 return &route;
}
static bool restoredAnimalStrikeCurrent(const IntentState& s,const ActiveIntent& intent,bool acquired){
 const auto& restored=intent.restoredAnimalStrike;
 if(!restored||!intent.animal||!intent.lease||intent.generation||
    intent.state!=(acquired?PlanningState::ActionActive:PlanningState::AwaitingResources))return false;
 const auto& q=*restored->source;
 const auto target=s.targets.find(q.target),center=s.targets.find(q.center);
 SpatialBodyView body;
 return q.actor==intent.actor&&q.target==intent.target&&q.sequence==intent.resourceRequestSequence&&
   q.at==intent.resourceRequestedAt&&target!=s.targets.end()&&
   (q.attackCenter?(q.target==q.center&&target->second.kind==4&&(acquired||intactAttackCenter(target->second))):
    (target->second.kind<3&&(acquired||target->second.active)))&&target->second.x==q.targetX&&target->second.z==q.targetZ&&
   center!=s.targets.end()&&(acquired||center->second.active)&&center->second.x==q.centerX&&center->second.z==q.centerZ&&
   spatialReadBody(q.body,body)&&body.kind==1&&body.flags==1&&body.r==q.radius&&body.x==q.x&&body.z==q.z&&
   !s.reservedBodies.count(q.body)&&!s.suspendedBodies.count(q.body);
}
// Declare a saved action on this session's stationary body. A restored
// attack has no route ticket, and declaration cannot issue its effect.
EMSCRIPTEN_KEEPALIVE int nav_animal_strike_restore_request(double actor,double session,double bodyId,double centerId,
 double attackId,double clip,double duration,double remaining,double phase,double yaw){
 auto& s=state();
 if(session!=double(s.session)||!integer(actor)||!integer(bodyId)||!integer(centerId)||!integer(attackId)||
    !integer(clip,true)||clip>=4||!std::isfinite(duration)||duration<=0||duration>120||
    !std::isfinite(remaining)||remaining<=0||remaining>duration||!std::isfinite(phase)||phase<0||!std::isfinite(yaw))
  return -1;
 if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 const auto found=s.activeIntents.find(uint64_t(actor)),end=s.activeIntents.end();
 if(found==end||s.activeIntents.size()!=1||spatial_body_count()!=1)return -2;
 auto& intent=found->second;
 const auto center=s.targets.find(uint64_t(centerId)),target=s.targets.find(intent.target);
 const bool attackCenter=target!=s.targets.end()&&target->first==uint64_t(centerId)&&intactAttackCenter(target->second);
 SpatialBodyView body;
 if(!intent.animal||!intent.lease||!intent.approachKnown||intent.state!=PlanningState::ActionActive||
    intent.generation||intent.requiresResources||intent.restoredAnimalStrike||intent.animalStrike||
    target==s.targets.end()||!target->second.active||(!attackCenter&&target->second.kind>=3)||center==s.targets.end()||!center->second.active||
    !spatialReadBody(uint64_t(bodyId),body)||body.kind!=1||body.flags!=1||!(body.r>0&&body.r<=2)||
    body.x!=intent.approachX||body.z!=intent.approachZ||float(body.r)!=intent.approachRadius||
    !s.reservedBodies.empty()||!s.suspendedBodies.empty())return -2;
 const auto q=std::make_shared<NativeAnimalRouteRequest>(NativeAnimalRouteRequest{
  intent.actor,intent.target,uint64_t(bodyId),uint64_t(centerId),0,s.effectiveTime,body.x,body.z,yaw,body.r,phase,
  center->second.x,center->second.z,false,target->second.x,target->second.z,attackCenter});
 intent.restoredAnimalStrike=std::make_shared<RestoredAnimalStrike>(RestoredAnimalStrike{q,uint64_t(attackId),int(clip),duration,remaining});
 intent.state=PlanningState::AwaitingResources;intent.requiresResources=true;
 q->sequence=emitIntentChange(s,intent);
 s.entityRevision++;return 1;
}
static int stageRestoredAnimalStrike(IntentState& s,uint64_t actor,double clip,double duration){
 const auto found=s.activeIntents.find(actor);
 if(found==s.activeIntents.end()||!restoredAnimalStrikeCurrent(s,found->second,false))return -2;
 const auto& r=found->second.restoredAnimalStrike;
 const auto& q=*r->source;
 if(clip!=r->clip||duration!=r->duration||!(s.effectiveTime+r->remaining>s.effectiveTime))return -2;
 const int previous=lazy_selected_context(),profile=found->second.profile;
 if(previous!=profile)spatial_select_nav_profile_index(profile);
 const int clear=spatial_animal_attack_segment_clear(q.x,q.z,q.x,q.z,q.radius);
 if(previous!=profile)spatial_select_nav_profile_index(previous);
 if(clear!=1)return -7;
 const int result=stageWorldMutationBoundary(nullptr,0);if(result!=1)return result;
 auto& p=s.barrierProposal;p.kind=27;
 NativeAnimalStrike draft;draft.restored=r;
 draft.header={1,double(actor),double(q.body),double(q.target),0,0,0,
  clip,duration,q.targetX,q.targetZ,q.x,q.z,q.phase,q.heading,p.at,p.at+r->remaining,double(p.ticket),double(p.session)};
 p.animalStrike=std::move(draft);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_animal_strike_proposal_stage(double actor,double session,double assignment,double clip,double duration){
 auto& s=state();
 if(!integer(actor)||!integer(assignment,true)||session!=double(s.session)||!integer(clip,true)||clip>=4||!std::isfinite(duration)||duration<=0||duration>120)return -1;
 if(assignment==0)return stageRestoredAnimalStrike(s,uint64_t(actor),clip,duration);
 const auto* route=animalStrikeRoute(s,uint64_t(actor),uint64_t(assignment));
 if(!route)return -2;
 const auto& body=route->executionPose;const auto& binding=route->animalRouteBinding;
 const auto& target=s.targets.at(binding->source->target);
 const double dx=target.x-body[0],dz=target.z-body[1];
 if(!std::isfinite(dx)||!std::isfinite(dz)||(dx==0&&dz==0)||!(s.effectiveTime+duration>s.effectiveTime))return -2;
 const int result=stageWorldMutationBoundary(nullptr,0);if(result!=1)return result;
 auto& p=s.barrierProposal;p.kind=27;
 NativeAnimalStrike draft;draft.route=binding;
 draft.header={1,actor,double(binding->source->body),double(target.id),assignment,double(binding->actual.ticket),double(route->generation),
               clip,duration,target.x,target.z,body[0],body[1],body[3],std::atan2(dx,dz),p.at,p.at+duration,double(p.ticket),double(p.session)};
 p.animalStrike=std::move(draft);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_animal_strike_proposal_snapshot(double session,double ticket){
 const auto& p=state().barrierProposal;return p.animalStrike&&p.kind==27?takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),27):-1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_animal_strike_proposal_header_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==27&&p.animalStrike?p.animalStrike->header.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_animal_strike_proposal_cancel(double session,double ticket){const auto& p=state().barrierProposal;return p.kind==27&&p.animalStrike?nav_intent_barrier_proposal_cancel(session,ticket):0;}
EMSCRIPTEN_KEEPALIVE int nav_animal_strike_proposal_revalidate(double session,double ticket){
 auto& s=state();auto& p=s.barrierProposal;
 if(!p.pending||!p.animalStrike||p.kind!=27||session!=double(p.session)||ticket!=double(p.ticket))return -1;
 const auto old=*p.animalStrike;const auto& h=old.header;clearWorldMutationProposal(p);
 const int result=nav_animal_strike_proposal_stage(h[1],session,h[4],h[7],h[8]);if(result!=1)return result;
 auto& next=*p.animalStrike;
 if(next.route!=old.route||next.restored!=old.restored||!std::equal(h.begin(),h.begin()+15,next.header.begin())){clearWorldMutationProposal(p);return -2;}
 next.prepared=old.header;return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_animal_strike_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket,double attackId){
 auto& s=state();auto& p=s.barrierProposal;if(!integer(attackId)||!integer(preparedTicket)||!p.animalStrike)return -1;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,27);if(valid!=1)return valid;
 auto draft=*p.animalStrike;const auto& h=draft.header;
 if(preparedTicket!=ticket&&(!draft.prepared||(*draft.prepared)[17]!=preparedTicket))return -9;
 auto& intent=s.activeIntents.at(uint64_t(h[1]));
 if(draft.restored){
  if(draft.restored!=intent.restoredAnimalStrike||draft.restored->attackId!=attackId||!restoredAnimalStrikeCurrent(s,intent,false))return -2;
 }else{
  const auto* route=animalStrikeRoute(s,uint64_t(h[1]),uint64_t(h[4]));
  if(!route||route->animalRouteBinding!=draft.route)return -2;
 }
 const auto& target=s.targets.at(uint64_t(h[3]));if(target.x!=h[9]||target.z!=h[10])return -2;
 if(preparedTicket==ticket)draft.prepared=h;
 draft.attackId=uint64_t(attackId);
 clearWorldMutationProposal(p);intent.animalStrike=std::make_shared<NativeAnimalStrike>(std::move(draft));
 intent.state=PlanningState::ActionActive;emitIntentChange(s,intent);
 spatialRecordMotionResourceBoundary(session,ticket,time,27);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_animal_strike_snapshot(double actor){
 auto& s=state();if(!integer(actor))return 0;const auto it=s.activeIntents.find(uint64_t(actor));
 if(it==s.activeIntents.end()||!it->second.animalStrike||it->second.state!=PlanningState::ActionActive)return 0;
 const auto& intent=it->second;const auto& strike=*intent.animalStrike;
 if(strike.restored?!restoredAnimalStrikeCurrent(s,intent,true):
    intent.slot>=s.routeSlots.size()||s.routeSlots[intent.slot].animalRouteBinding!=strike.route)return 0;
 const auto& h=strike.header;std::copy(h.begin(),h.end(),s.animalStrikeResult.begin());
 const double initial=strike.restored?h[8]-strike.restored->remaining:0;
 s.animalStrikeResult[19]=double(strike.attackId);s.animalStrikeResult[20]=std::clamp(initial+(s.effectiveTime-h[15]),initial,h[8]);
 s.animalStrikeResult[21]=s.effectiveTime;s.animalStrikeResult[22]=(*strike.prepared)[17];s.animalStrikeResult[23]=(*strike.prepared)[15];
 s.animalStrikeResult[24]=strike.source()->attackCenter?1.:0.;return 1;
}
// Standstill only. This receipt authorizes no route, clock or further damage.
EMSCRIPTEN_KEEPALIVE int nav_animal_finished_strike_snapshot(double actor){
 auto& s=state();
 if(!integer(actor)||!s.finishedAnimalStrike||s.activeIntents.count(uint64_t(actor)))return 0;
 const auto& h=*s.finishedAnimalStrike;SpatialBodyView body;
 if(h.actor!=uint64_t(actor)||h.session!=s.session||s.effectiveTime<h.at||
    !spatialReadBody(h.body,body)||body.kind!=1||body.flags!=1||
    body.x!=h.x||body.z!=h.z||body.r!=h.radius)return 0;
 s.animalStrikeResult={1.,double(h.session),actor,double(h.body),double(h.attack),
   h.x,h.z,h.radius,h.phase,h.yaw,h.at,double(h.covered?h.covered->shieldPolygon:0),double(h.target)};
 return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_animal_strike_snapshot_ptr(){return state().animalStrikeResult.data();}
