# Rejected depth diagnostic

QA only: disable mountain depth test and draw late. Existing atlas/arc becomes visible over foreground objects, confirming it is loaded/renderable but normally depth-occluded in these views. This invalid foreground overlay is intentionally diagnostic and rejected. No production edit. Native camera far500; radius430; recorded arc bounds and positions in captures.json. Follow-up raises the base25units with the depth test intact. Do not treat this diagnostic as an artistic improvement.
