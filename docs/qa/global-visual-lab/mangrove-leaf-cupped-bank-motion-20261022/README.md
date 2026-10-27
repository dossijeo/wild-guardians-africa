# Medium-quality bank-centred leaf motion

Real renderer, seed712,1280x720, medium, full native backgrounds/smooth far transitions. Deterministically choose an existing coverage anchor nearest the initial camera as the bank target, then approach/recede28→10→28m. Original and cupped cameras and per-frame leaf counts are exactly equal across240 requested frames/day/night. Near instances2254–3815, far1682–5084. No errors or overflow.

Rounded/creased leaves produce a clearer collective volume in this covered-bank close view than the original angular leaves. Inspected checkpoints and approach filmstrip show continuous coverage; exact retained-leaf endpoint attributes are separately unit-tested. These checks do not certify every possible angle, wind state or temporal artifact. Material/grass time fixed to isolate camera/LOD.

Four actual WebM recordings retained,235–236 encoded frames each; recorder drops mean requested frame indices cannot be matched one-to-one to encoded frames. Qualitative viewing only, not a performance measurement. Native integration parity is in the next directory.
