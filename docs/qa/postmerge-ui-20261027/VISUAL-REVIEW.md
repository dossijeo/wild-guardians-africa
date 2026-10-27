# Postmerge UI visual review

Reviewed actual captures from runtime b033d4175 (production runtime unchanged through PR221 head80f797393). Previously inspected home and route fractions .15/.35 at wide/portrait are supplemented with wide/portrait .6 and ultrawide .35. The near textured surface remains beneath the foot where visible; close framing naturally takes the foot outside the viewport. No visible separation in these samples. Existing independent distant parallax, colored particle lighting and navigation remain visible.

Decoded the 24.64-second wide menu journey recording at 2 fps, including options travel and return. Reviewed the 175.56-second packaged flow at 5-second spacing, then the new-world transition at 110–120 seconds at 3 fps and reloaded-world transition at 169–175.56 seconds at 4 fps. Both transitions clear the loading-island mist while turning toward the sky, descend into the populated world and reveal the HUD/tutorial. No blank world or persistent loading mist appears in those samples. Contact-sheet empty cells after the recording ends are not black game frames.

Local evidence: `totem-ground-v1/journey-contact.jpg`, `package-flow/contact-5s.jpg`, `package-flow/transition-new.jpg`, `package-flow/transition-reload.jpg`, and original WebM recordings. This is sampled visual review, not every-frame inspection or a physical presentation benchmark. The recording visibly spends substantial time loading: this review does not establish a loading-time improvement or close the residual fluency objective.

Windows run40561498662 and Linux run40561498770 were still in progress at this checkpoint. Do not infer their result from older PR220 CI.
