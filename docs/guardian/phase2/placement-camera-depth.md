# Camera-depth placement correction

A close perspective camera at (0,2,3), looking at (0,1.7,0), FOV 70, reproduced an invisible selected summon at (0,1.7,7.6). Its projected X/Y looked acceptable even though its center depth was beyond NDC 1 (behind the camera). The previous envelope score inspected only X/Y.

Envelope scoring now checks view-space depth against the camera near/far planes before projection, penalizing each invisible corner. This also avoids dividing such corners by a zero projection W. The regression verifies every selected envelope corner lies inside the depth interval for the reproduced case. Placement/singleton suites pass 21 tests. Existing collision checks and camera controls are unchanged.

This is a mathematical regression and planner correction, not a new full graphical camera-matrix acceptance. If every candidate is invalid, the existing best-effort fallback remains; the algorithm cannot guarantee visibility for targets wholly outside the view.
