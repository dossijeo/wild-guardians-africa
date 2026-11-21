# Guardian GPU preparation and terrain residency

A new native-world QA setup exposed SpatialChunkUnavailable from GuardianSummons.beginPrewarm -> plan -> nav.propsAt. GPU preparation computed an unused placement before nearby terrain was resident. Removed that call: material/mesh/effect preparation uses the existing camera target directly, as before; real casts still perform placement checks.

Nine singleton tests pass, including a regression ensuring prewarm never calls placement while still preparing Attack echoes. Browser repeat passed this failure point and reached the subsequent QA center-placement operation. That separate fixture operation still lacks resident terrain; the main-menu-to-beast acceptance run is incomplete. No claim of full gameplay load or graphical Attack acceptance from this run.
