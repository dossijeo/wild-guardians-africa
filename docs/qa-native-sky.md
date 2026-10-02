# Cielo HDR del lab de mundo

El Plan Maestro (§907–909) exige conservar el cielo de día/noche del lab
de biomas. WorldScene solo usaba un color uniforme. Ahora dibuja los dos HDR
RGBE originales de 2048×1024, ya incluidos en el inventario de assets.
No se añade otra copia de los panoramas.

`tools/prepare_sky.py` conserva el shader original completo, sus estrellas,
filtrado bilineal en radiancia, exposición 1,33/0,62 y saturación 1,28/1,10.
El decodificador conserva su algoritmo; solo recibe bytes externos en lugar
de base64 embebido. Las pruebas comparan todos los píxeles con el decodificador
del lab, además de hashes de fuente y recursos.

El cielo usa una escena independiente. No entra en sombras, toon ni captura
de profundidad de destrucción/VFX. La salida original ya contiene su gamma;
no recibe ACES ni otra conversión de color. Cada pasada tiene su propio
sampler y se restaura el estado del renderer incluso si falla el dibujo.
La orientación sigue la cámara, sin paralaje por traslación.

La mezcla conserva el coeficiente exponencial 2,4 del lab. Se calcula desde
el reloj simulado y las transiciones reales del juego, sin importar el ciclo
automático de demostración de 180 segundos. Así pausa y recarga conservan
la fase. El primer día comienza de día; un amanecer aplazado por una incursión
mantiene el cielo nocturno hasta la transición diaria efectiva.

Prueba aislada `tests/browser/world-sky.html`: compilación WebGL2 y panorama
diurno/nocturno, mezcla y giro. Capturas `native-sky-day.png` y
`native-sky-night.png`. WorldScene real en el visor African Toon permite
ver el horizonte, con terreno, poblado, centro, trabajadores y bestias.
La comprobación actual cubre los seis biomas, día/noche, cultura
Mapungubwe y calidad media; las doce vistas tienen capturas en test-results. Consola sin errores ni avisos.

Las tres pruebas dirigidas pasan; build, assets, reglas y paquete web pasan
(547 archivos, 791 enlaces relativos, 20 GLB de runtime). La regresión
integrada pasa 504/504 pruebas, sin omisiones, en 297,060 s
(`test-results/tests-native-sky-full.txt`). Este informe no acredita rendimiento móvil,
todos los VFX en acción ni las 30 combinaciones completas. Quedan la revisión
del agua, la iluminación, la cámara y la niebla/streaming frente al lab.
La niebla actual 130–250 permanece pendiente de esa revisión; no procede
considerar restaurada toda la atmósfera del mundo por integrar los HDR.
