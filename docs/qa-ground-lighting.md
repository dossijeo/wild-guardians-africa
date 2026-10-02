# Superficie e iluminación del terreno African Toon

`tools/prepare_ground_lighting.py` extrae del shader entregado las fórmulas
de vegetación, rugosidad, humedad, estratos, arena y perturbación de normales
por derivadas. Los colores nativos se modifican en RGB antes de convertirse
una vez a lineal, como en la fuente. La calidad mínima desactiva el detalle
de normales, conservando la paleta y la iluminación; el horizonte utiliza
el mismo camino que los chunks residentes.

Se recuperan Fresnel y BRDF originales, relleno cielo/suelo, radiancia HDR y
mezcla nocturna. El suelo húmedo de manglar recibe así el `lit` que espera
la rama específica de `africanToon4`; antes recibía la iluminación genérica
de Three y una superficie incompleta. El resto de terrenos conserva las
bandas cel originales, sin asignarles el término de follaje de los props.
Las sombras de Three se convierten a visibilidad con el factor original 0,93.

Regresión completa: 545/545, sin omisiones ni cancelaciones, en 309,865 s
(`test-results/tests-ground-light-full.txt`). Pruebas dirigidas: 12/12,
sin omisiones, en 3,849 s. Comparan hash y recetas
extraídas con la fuente, conversión de color, binding de samplers, caminos
Basic/Standard y aislamiento de materiales de objetos. Build aprobado en
12,24 s; paquete web: 547 archivos / 379.363.736 bytes / 791 enlaces relativos /
20 GLB de ejecución, sin originales duplicados. CI del cambio previo
`31e338c` aprobada en la ejecución 37033160321.

CUA en WorldScene, Mapungubwe/712: seis biomas de día, cañón en alta, desierto
en muy baja y manglar también de noche. Estados y logs consultados no muestran
errores ni avisos; el indicador WebGL muestra cero errores. Capturas
`test-results/ground-light-*.png` y estados en `ground-light-browser.json`.
La rasante de manglar oculta props y conserva cámara fija al alternar HDR:
en una región de suelo de 800×230 píxeles cambian los 184.000 píxeles,
con diferencia media de 25,744 por canal en escala 0–255. Este contraste
acredita aporte HDR, no igualdad de píxeles frente a otro renderer.

Sigue pendiente el mapa nativo de AO de contacto: esta revisión utiliza
`objAO=1`. También quedan emisión específica de props volcánicos, requisitos
de rendimiento/LOD/batching/worker/origen flotante, móviles e interacción de
campaña. La fixture visual no guarda ni simula una campaña; esta revisión
no acredita toda la aceptación del Plan Maestro.
