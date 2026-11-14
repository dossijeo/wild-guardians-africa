# Attack contact hold

The projectile uses the selected surface contact and reaches it at .24 seconds. Attack immediately interrupts navigation and applies damage, while physical response and impact audio use the shared delayed marker. Rhinoceros previously had a .20-second stun, leaving a .04-second interval in which navigation could resume before the visual contact (including after resilience exhaustion changes its state to retreating).

The interruption now lasts max(species stun, shared impact delay). This changes rhinoceros from .20 to .24 seconds; hyena .70, warthog .55, lion .45 and buffalo .30 remain unchanged. Damage, cooldown and physical impulse are unchanged. This avoids moving the selected contact during the short flight without delaying command acceptance.

A regression test reproduced the rhinoceros mismatch before the fix. It exercises updateRaid for all five species, both walking and newly retreating, at .05, .14 and .239 seconds: position/contact remain fixed and impact deformation has not begun. Combat, singleton, physical-recovery and animal-audio suites pass 63 tests after the fix. This verifies the simulation/presentation timing contract, not new graphical acceptance of every impact angle.
