# Rinoceronte expresivo: candidato corregido

Todavía no instalado en el catálogo. Conserva el original e77e4a48a6d072d58420575e0e58b3545e8f4eb5d8ea54f4a7f38819e93f1cff.glb.

Fuente editable empaquetada con texturas limitadas a 2048; geometría intacta. El GLB se comprime directamente desde la exportación de máxima resolución y conserva exactamente geometría, morphs y canales de animación. Los atlas de párpados requieren WebP lossless.

Reconstrucción: prototype_rhino_jaw.py con corrected-mouth-landmarks.json → add_rhino_oral_cavity.py con el informe de corte → add_actor_eyelids.py dos veces con eyelid-left-profile.json y eyelid-right-profile.json. Los perfiles están en docs/guardian/phase2/face-authoring/rhino. Pasar --source-glb original a los exportadores para restaurar los canales nativos; no usar directamente los clips remuestreados de Blender.

El corte anterior subnasal está descartado. La boca actual sigue la referencia inferior del usuario, tiene cavidad, lengua y paredes interiores. Se conserva el rig original y RearCloth. Evidencia: corrected-runtime contiene prueba Three.js, ciclo de Attack diurno y limitaciones pendientes. No equivale a validar todas las poses, colisiones o rendimiento.
