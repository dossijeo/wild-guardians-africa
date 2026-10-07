# Native self-shadow isolation

QA source6914688, Sabana/Mapungubwe/media, same native-sun pilot and orbital5s pose as far-native-sun-matching. The offline baker has no shadow caster/light in its scene and uNativeShadowOn defaults0; native WorldScene supplies real PCF visibility to artLighting416. This is an additional actual recipe difference.

The QA-only control disables renderer.shadowMap without altering mesh geometry/LOD or camera. Confirmed native uniform1→0 and identical camera. The canopy screen-door texture remains perceptible with shadows disabled; removing shadows alone does not establish matching or explain all contrast. No production shadow change, no GPU timing, no acceptance claim.
