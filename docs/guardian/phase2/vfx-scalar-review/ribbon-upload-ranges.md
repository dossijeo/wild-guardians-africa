# Active ribbon upload ranges

Ribbon buffers now mark only their live float range for subsequent GPU uploads. Empty ribbons no longer increment the buffer version. Initial GPU allocation still reserves the full buffer capacity. Geometry generation, draw range and visible vertex data are unchanged.

The renderer suite checks all 18 compositions against native geometry, including repeated seeks at 0, .15, .8, 2, 0 and .4 seconds to cover reuse. The combined native/rendering suites pass 22 tests. These are CPU-side upload-contract checks, not new graphical validation or a measured frame-time improvement. The integrated performance acceptance remains open.
