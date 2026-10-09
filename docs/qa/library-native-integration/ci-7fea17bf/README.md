# Library integration CI verification

Validate game run [37951402863](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37951402863) passed on `7fea17bf`, including the production fullscreen library fix, focused iframe Escape lifecycle correction and menu generation parity.

The retained raw log reports 3743 passing tests, zero failures, a successful production build and package checks: 711 files, 860 relative links and 22 runtime GLBs. The itch artifact is `wild-guardians-itch.zip`, ID 11626548093, 388365712 bytes, with CRC verification recorded by packaging.

This verifies CI at the specified source. It does not establish rendered mobile layout acceptance, publication on itch.io, or resolution of the independent Windows loading regression. The mobile labs layout and SFX menu-music mute requests remain deferred as requested.
