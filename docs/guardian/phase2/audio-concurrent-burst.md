# Guardian concurrent Web Audio requests

Expanded the real-browser lifecycle fixture with 16 concurrent requests (eight arrivals and eight launches). The latest two requests return sources; all earlier promises return null. Once settled, voices and active-source collections contain exactly two entries. Scene stop clears both, and disposal closes the real 48 kHz AudioContext. All 23 browser assertions pass; six Node presence/lifecycle tests also pass.

Raw result: audio-concurrent-burst.json. This verifies cancellation/ownership with the installed SFX bank and actual decode/playback APIs, not subjective loudness, species sound identity or a full battle mix. The assertion named never retains more than two voices observes the settled burst endpoint; the existing unit tests cover admission ordering. No continuous browser voice-count trace is claimed. No runtime change was required.

Fetched origin/main before this check: zero commits behind. Existing unrelated untracked authoring artifacts were preserved; no main merge performed.
