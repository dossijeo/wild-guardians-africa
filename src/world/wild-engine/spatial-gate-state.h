struct NativeGate {
  uint64_t id=0;
  double x=0,z=0,yaw=0,sx=1,sz=1,hx=0,hz=0,trigger=0;
  double from=0,target=0,at=0;
  bool defined=false,requested=false,occupied=false;
  int status=0;
  std::vector<double> local,closed,swing;
  SpatialStaticMutation unsupported;
};
