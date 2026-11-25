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
 const auto target=s.targets.find(intent.target);
 if(target==s.targets.end()||!target->second.active||target->second.kind>=3)return nullptr;
 SpatialBodyView body;
 if(!spatialReadBody(route.reservationBody,body)||body.kind!=1||body.flags!=1||body.x!=route.executionPose[0]||
    body.z!=route.executionPose[1]||body.r!=route.radius)return nullptr;
 return &route;
}
EMSCRIPTEN_KEEPALIVE int nav_animal_strike_proposal_stage(double actor,double session,double assignment,double clip,double duration){
 auto& s=state();
 if(!integer(actor)||!integer(assignment)||session!=double(s.session)||!integer(clip,true)||clip>=4||!std::isfinite(duration)||duration<=0||duration>120)return -1;
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
 if(next.route!=old.route||!std::equal(h.begin(),h.begin()+15,next.header.begin())){clearWorldMutationProposal(p);return -2;}
 next.prepared=old.header;return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_animal_strike_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket,double attackId){
 auto& s=state();auto& p=s.barrierProposal;if(!integer(attackId)||!integer(preparedTicket)||!p.animalStrike)return -1;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,27);if(valid!=1)return valid;
 auto draft=*p.animalStrike;const auto& h=draft.header;
 if(preparedTicket!=ticket&&(!draft.prepared||(*draft.prepared)[17]!=preparedTicket))return -9;
 const auto* route=animalStrikeRoute(s,uint64_t(h[1]),uint64_t(h[4]));if(!route||route->animalRouteBinding!=draft.route)return -2;
 const auto& target=s.targets.at(uint64_t(h[3]));if(target.x!=h[9]||target.z!=h[10])return -2;
 if(preparedTicket==ticket)draft.prepared=h;
 draft.attackId=uint64_t(attackId);auto& intent=s.activeIntents.at(uint64_t(h[1]));
 clearWorldMutationProposal(p);intent.animalStrike=std::make_shared<NativeAnimalStrike>(std::move(draft));
 intent.state=PlanningState::ActionActive;emitIntentChange(s,intent);
 spatialRecordMotionResourceBoundary(session,ticket,time,27);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_animal_strike_snapshot(double actor){
 auto& s=state();if(!integer(actor))return 0;const auto it=s.activeIntents.find(uint64_t(actor));
 if(it==s.activeIntents.end()||!it->second.animalStrike||it->second.state!=PlanningState::ActionActive)return 0;
 const auto& intent=it->second;const auto& strike=*intent.animalStrike;
 if(intent.slot>=s.routeSlots.size()||s.routeSlots[intent.slot].animalRouteBinding!=strike.route)return 0;
 const auto& h=strike.header;std::copy(h.begin(),h.end(),s.animalStrikeResult.begin());
 s.animalStrikeResult[19]=double(strike.attackId);s.animalStrikeResult[20]=std::clamp(s.effectiveTime-h[15],0.,h[8]);
 s.animalStrikeResult[21]=s.effectiveTime;s.animalStrikeResult[22]=(*strike.prepared)[17];s.animalStrikeResult[23]=(*strike.prepared)[15];return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_animal_strike_snapshot_ptr(){return state().animalStrikeResult.data();}
