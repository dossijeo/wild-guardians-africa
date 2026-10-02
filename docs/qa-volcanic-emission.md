# Emisión volcánica y bandas cel

Los seis manifiestos originales activan `volcanicGlow` únicamente en Volcanes.
Los props comparten su atlas original y recuperan la máscara roja de la fuente:
umbrales 0,65–0,93, diferencia rojo/verde 0,12–0,34, exclusión azul 0,18–0,35
y radiancia `toLinear4(texel.rgb) * hot * 1.65`. El color del atlas se recupera
de sRGB antes del oscurecimiento superficial por humedad.

Hay una adaptación explícita del shader aportado: su `main` añade esa radiancia
a `lit`, pero las bandas cel de `africanToon4` recalculan el color sin usarlo.
La función derivada suma la misma emisión después del pigmento y antes de su
curva filmic. Conserva bandas, reflejos, contornos y gradación; no añade bloom
ni una segunda curva tonal. Con emisión cero, el cuerpo de esa función coincide
con el original tras retirar el argumento y la suma. El archivo entregado queda
archivado sin cambios. Los materiales ajenos a los props conservan su función
original; los GLTF siguen conservando su emisión propia.

Pruebas dirigidas: 26/26 en 2,903 s, sin omisiones. Comprueban hash, fórmula y
adaptación exacta; activación de 120 materiales según los seis manifiestos;
texturas, recorte, ocultación y aislamiento de terreno/objetos sin superficie
nativa. Regresión completa: 550/550 en 323,678 s, sin fallos, cancelaciones ni
omisiones (`test-results/tests-volcanic-full.txt`). Build en 15,64 s y paquete
web aprobado: 547 archivos / 379.369.186 bytes / 791 enlaces relativos /
20 GLB de ejecución, sin originales duplicados. CI anterior `37dfbd7`
aprobada en la ejecución 37036350796.

CUA de los seis biomas en WorldScene/Mapungubwe/712: los cinco no volcánicos
registran emisión cero; Volcanes se inspecciona con día/noche y tres calidades.
El indicador WebGL registra cero errores y los logs consultados no contienen
errores ni avisos. La comparación de emisión activada/desactivada fija cámara, tiempo y ocultación
en el visor de WorldScene. En una región de 627.200 píxeles cambian 45.225 de
día (máximo 120 por canal) y 55.279 de noche (máximo 174); el aporte permanece
visible sin sombras en muy baja y con 49 chunks en alta. Capturas
`test-results/volcanic-*.png`, estados en `volcanic-browser.json` y métricas
en `volcanic-pixels.json`. El visor no guarda ni simula una campaña.

Quedan requisitos de LOD/batching/worker/origen flotante, rendimiento móvil,
matriz completa de interacción y otros apartados del Plan Maestro. Esta
revisión no acredita la fidelidad completa del renderer ni los 159 casos
de aceptación del proyecto.
