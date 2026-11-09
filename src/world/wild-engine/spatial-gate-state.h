struct NativeGate {
  uint64_t id=0;
  double x=0,z=0,yaw=0,sx=1,sz=1,hx=0,hz=0,trigger=0;
  double from=0,target=0,at=0;
  bool defined=false,requested=false,occupied=false;
  bool bodySweepCertified=false;
  int status=0;
  std::vector<double> local,closed,swing;
  SpatialStaticMutation unsupported;
};
// A transient transaction proposal, not another live gate/planning model.
struct NativeGateMotionProposal {
  bool pending=false;uint32_t session=0;uint64_t ticket=0;
  double at=0;
  uint64_t bodies=0,entities=0,factsSequence=0,intents=0,reservations=0;
  std::array<uint64_t,3> world{};
  std::map<uint64_t,NativeGate> gates;
};
